from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission

from .models import Member
from .serializers import MemberDetailSerializer, MemberWriteSerializer


class MemberModelTests(APITestCase):
    def test_member_code_auto_generation_and_default_status(self):
        member1 = Member.objects.create(first_name="Ali", last_name="One", phone="0700000001")
        member2 = Member.objects.create(first_name="Sara", last_name="Two", phone="0700000002")

        self.assertTrue(member1.member_code.startswith("MEM-"))
        self.assertTrue(member2.member_code.startswith("MEM-"))
        self.assertNotEqual(member1.member_code, member2.member_code)
        self.assertEqual(member1.status, "active")


class MemberSerializerTests(APITestCase):
    def test_bmi_computation_and_category(self):
        member = Member.objects.create(
            first_name="BMI",
            last_name="Test",
            phone="0700000003",
            height_cm=Decimal("175"),
            weight_kg=Decimal("70"),
        )
        data = MemberDetailSerializer(member).data
        self.assertEqual(data["bmi"], 22.9)
        self.assertEqual(data["bmi_category"], "normal")

    def test_invalid_partial_bmi_input(self):
        serializer = MemberWriteSerializer(
            data={
                "first_name": "Partial",
                "last_name": "Input",
                "phone": "0700000004",
                "height_cm": "175",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("Height and weight must both be provided", str(serializer.errors))

    def test_non_positive_bmi_values(self):
        serializer = MemberWriteSerializer(
            data={
                "first_name": "Bad",
                "last_name": "Weight",
                "phone": "0700000005",
                "height_cm": "175",
                "weight_kg": "-3",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("weight_kg", serializer.errors)


class MemberAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_members_permissions()
        cls.admin_user = User.objects.create_user(
            username="admin_user", password="pass12345", role_name="admin"
        )
        cls.receptionist_user = User.objects.create_user(
            username="rec_user", password="pass12345", role_name="receptionist"
        )
        cls.viewer_user = User.objects.create_user(
            username="viewer_user", password="pass12345", role_name="viewer"
        )

    @classmethod
    def _seed_members_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="members",
                action=action,
                defaults={"description": f"Can {action} members"},
            )
            permissions[action] = permission

        role_action_map = {
            "admin": ["all"],
            "receptionist": ["view", "add", "change"],
            "viewer": ["view"],
        }

        allowed_roles = {role for role, _ in ROLE_CHOICES}
        for role_name, role_actions in role_action_map.items():
            if role_name not in allowed_roles:
                continue
            for action in role_actions:
                RolePermission.objects.get_or_create(
                    role_name=role_name,
                    permission=permissions[action],
                )

    def setUp(self):
        self.list_url = reverse("members:members-list")
        self.member = Member.objects.create(
            first_name="John",
            last_name="Doe",
            phone="0700000009",
            email="john@example.com",
            status="active",
            height_cm=Decimal("170"),
            weight_kg=Decimal("70"),
        )

    def test_admin_create_member(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "first_name": "New",
            "last_name": "Member",
            "phone": "0700000008",
            "id_card_number": "ID-12345",
            "blood_group": "O+",
            "status": "active",
            "join_date": "2026-02-20",
            "height_cm": "180",
            "weight_kg": "80",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("member_code", response.data)
        self.assertEqual(response.data["id_card_number"], "ID-12345")
        self.assertEqual(response.data["blood_group"], "O+")

    def test_receptionist_can_update_member(self):
        self.client.force_authenticate(user=self.receptionist_user)
        detail_url = reverse("members:members-detail", kwargs={"pk": self.member.id})
        response = self.client.patch(detail_url, {"last_name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.last_name, "Updated")

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(user=self.viewer_user)
        create_response = self.client.post(
            self.list_url,
            {
                "first_name": "Blocked",
                "last_name": "User",
                "phone": "0700000007",
                "status": "active",
                "join_date": "2026-02-20",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

    def test_search_and_status_filter(self):
        Member.objects.create(
            first_name="Jane",
            last_name="Smith",
            phone="0700000006",
            email="jane@example.com",
            status="inactive",
        )
        self.client.force_authenticate(user=self.admin_user)

        search_response = self.client.get(self.list_url, {"search": "Jane"})
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["count"], 1)
        self.assertEqual(search_response.data["results"][0]["first_name"], "Jane")

        status_response = self.client.get(self.list_url, {"status": "active"})
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.data["count"], 1)
        self.assertEqual(status_response.data["results"][0]["status"], "active")

    def test_activate_and_deactivate_actions(self):
        self.client.force_authenticate(user=self.admin_user)
        deactivate_url = reverse("members:members-deactivate", kwargs={"pk": self.member.id})
        activate_url = reverse("members:members-activate", kwargs={"pk": self.member.id})

        deactivate_response = self.client.post(deactivate_url)
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.status, "inactive")

        activate_response = self.client.post(activate_url)
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.status, "active")
