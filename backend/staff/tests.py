from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission

from .models import Staff, Trainer
from .serializers import StaffDetailSerializer, StaffWriteSerializer


class StaffModelTests(APITestCase):
    def test_staff_code_auto_generation(self):
        staff1 = Staff.objects.create(
            position="manager",
            first_name="Ali",
            last_name="One",
            mobile_number="0700000001",
            date_hired="2026-02-20",
            monthly_salary=Decimal("10000"),
            salary_status="unpaid",
            employment_status="active",
        )
        staff2 = Staff.objects.create(
            position="manager",
            first_name="Sara",
            last_name="Two",
            mobile_number="0700000002",
            date_hired="2026-02-20",
            monthly_salary=Decimal("12000"),
            salary_status="paid",
            employment_status="active",
        )

        self.assertTrue(staff1.staff_code.startswith("STF-"))
        self.assertTrue(staff2.staff_code.startswith("STF-"))
        self.assertNotEqual(staff1.staff_code, staff2.staff_code)

    def test_trainer_code_auto_generation(self):
        staff1 = Staff.objects.create(
            position="trainer",
            first_name="Trainer",
            last_name="One",
            mobile_number="0700000101",
            date_hired="2026-02-20",
            monthly_salary=Decimal("10000"),
            salary_status="unpaid",
            employment_status="active",
        )
        staff2 = Staff.objects.create(
            position="trainer",
            first_name="Trainer",
            last_name="Two",
            mobile_number="0700000102",
            date_hired="2026-02-20",
            monthly_salary=Decimal("12000"),
            salary_status="paid",
            employment_status="active",
        )
        trainer1 = Trainer.objects.create(staff=staff1)
        trainer2 = Trainer.objects.create(staff=staff2)

        self.assertTrue(trainer1.trainer_code.startswith("TRN-"))
        self.assertTrue(trainer2.trainer_code.startswith("TRN-"))
        self.assertNotEqual(trainer1.trainer_code, trainer2.trainer_code)


class StaffSerializerTests(APITestCase):
    def test_age_computation(self):
        dob = date(1996, 1, 15)
        staff = Staff.objects.create(
            position="manager",
            first_name="Age",
            last_name="Check",
            mobile_number="0700000003",
            date_of_birth=dob,
            date_hired="2026-02-20",
            monthly_salary=Decimal("11000"),
            salary_status="paid",
            employment_status="active",
        )

        data = StaffDetailSerializer(staff).data
        today = date.today()
        expected_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        self.assertEqual(data["age"], expected_age)

    def test_invalid_salary_and_dates(self):
        future_date = (date.today() + timedelta(days=1)).isoformat()
        serializer = StaffWriteSerializer(
            data={
                "position": "manager",
                "first_name": "Invalid",
                "last_name": "Salary",
                "mobile_number": "0700000004",
                "date_hired": future_date,
                "monthly_salary": "-5",
                "salary_status": "unpaid",
                "employment_status": "active",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertTrue(
            "monthly_salary" in serializer.errors or "date_hired" in serializer.errors
        )

    def test_position_other_is_required(self):
        serializer = StaffWriteSerializer(
            data={
                "position": "other",
                "first_name": "Other",
                "last_name": "Staff",
                "mobile_number": "0700000005",
                "date_hired": "2026-02-20",
                "monthly_salary": "10000",
                "salary_status": "paid",
                "employment_status": "active",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("position_other", serializer.errors)

    def test_position_trainer_creates_related_trainer(self):
        serializer = StaffWriteSerializer(
            data={
                "position": "trainer",
                "first_name": "Trainer",
                "last_name": "Create",
                "mobile_number": "0700000006",
                "date_hired": "2026-02-20",
                "monthly_salary": "11000",
                "salary_status": "paid",
                "employment_status": "active",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        staff = serializer.save()
        self.assertTrue(Trainer.objects.filter(staff=staff).exists())


class StaffAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_staff_permissions()
        cls.admin_user = User.objects.create_user(
            username="admin_user_staff", password="pass12345", role_name="admin"
        )
        cls.receptionist_user = User.objects.create_user(
            username="rec_user_staff", password="pass12345", role_name="receptionist"
        )
        cls.viewer_user = User.objects.create_user(
            username="viewer_user_staff", password="pass12345", role_name="viewer"
        )

    @classmethod
    def _seed_staff_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="staff",
                action=action,
                defaults={"description": f"Can {action} staff"},
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
        self.list_url = reverse("staff:staff-list")
        self.staff = Staff.objects.create(
            position="trainer",
            first_name="John",
            last_name="Doe",
            mobile_number="0799999999",
            email="john.staff@example.com",
            date_hired="2026-02-20",
            monthly_salary=Decimal("15000"),
            salary_status="unpaid",
            employment_status="active",
        )
        Trainer.objects.create(staff=self.staff)

    def test_admin_create_staff_trainer(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "position": "trainer",
            "first_name": "New",
            "last_name": "Trainer",
            "mobile_number": "0788888888",
            "id_card_number": "T-12345",
            "date_hired": "2026-02-20",
            "monthly_salary": "17000",
            "salary_status": "paid",
            "employment_status": "active",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("staff_code", response.data)

    def test_receptionist_can_update_staff_and_remove_trainer_profile(self):
        self.client.force_authenticate(user=self.receptionist_user)
        detail_url = reverse("staff:staff-detail", kwargs={"pk": self.staff.id})
        response = self.client.patch(
            detail_url,
            {"last_name": "Updated", "position": "manager"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.last_name, "Updated")
        self.assertEqual(self.staff.position, "manager")
        self.assertFalse(Trainer.objects.filter(staff=self.staff).exists())

    def test_switch_to_trainer_creates_profile(self):
        self.client.force_authenticate(user=self.receptionist_user)
        staff = Staff.objects.create(
            position="manager",
            first_name="Role",
            last_name="Switch",
            mobile_number="0700000999",
            date_hired="2026-02-20",
            monthly_salary=Decimal("10000"),
            salary_status="paid",
            employment_status="active",
        )
        detail_url = reverse("staff:staff-detail", kwargs={"pk": staff.id})
        response = self.client.patch(
            detail_url,
            {"position": "trainer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Trainer.objects.filter(staff=staff).exists())

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(user=self.viewer_user)
        create_response = self.client.post(
            self.list_url,
            {
                "position": "manager",
                "first_name": "Blocked",
                "last_name": "Staff",
                "mobile_number": "0777777777",
                "date_hired": "2026-02-20",
                "monthly_salary": "13000",
                "salary_status": "unpaid",
                "employment_status": "active",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

    def test_search_filter_and_ordering(self):
        staff = Staff.objects.create(
            position="manager",
            first_name="Jane",
            last_name="Smith",
            mobile_number="0766666666",
            email="jane.staff@example.com",
            date_hired="2026-02-19",
            monthly_salary=Decimal("14000"),
            salary_status="partial",
            employment_status="inactive",
        )
        self.client.force_authenticate(user=self.admin_user)

        search_response = self.client.get(self.list_url, {"search": "Jane"})
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["count"], 1)
        self.assertEqual(search_response.data["results"][0]["first_name"], "Jane")

        status_response = self.client.get(self.list_url, {"employment_status": "inactive"})
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.data["count"], 1)
        self.assertEqual(status_response.data["results"][0]["employment_status"], "inactive")

        salary_response = self.client.get(self.list_url, {"salary_status": "unpaid"})
        self.assertEqual(salary_response.status_code, status.HTTP_200_OK)
        self.assertEqual(salary_response.data["count"], 1)
        self.assertEqual(salary_response.data["results"][0]["salary_status"], "unpaid")

        ordering_response = self.client.get(self.list_url, {"ordering": "monthly_salary"})
        self.assertEqual(ordering_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(ordering_response.data["count"], 2)

    def test_activate_and_deactivate_actions(self):
        self.client.force_authenticate(user=self.admin_user)
        deactivate_url = reverse("staff:staff-deactivate", kwargs={"pk": self.staff.id})
        activate_url = reverse("staff:staff-activate", kwargs={"pk": self.staff.id})

        deactivate_response = self.client.post(deactivate_url)
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.employment_status, "inactive")

        activate_response = self.client.post(activate_url)
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.employment_status, "active")
