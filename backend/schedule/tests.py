from datetime import date, time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission
from members.models import Member
from staff.models import Staff, Trainer

from .models import ScheduleClass, ScheduleSlot


class ScheduleModelTests(APITestCase):
    def setUp(self):
        self.staff = Staff.objects.create(
            position="trainer",
            first_name="Model",
            last_name="Trainer",
            mobile_number="0701000001",
            date_hired="2026-02-20",
            monthly_salary=Decimal("12000"),
            salary_status="paid",
            employment_status="active",
        )
        self.trainer = Trainer.objects.create(staff=self.staff)
        self.schedule_class = ScheduleClass.objects.create(
            name="Yoga",
            default_duration_minutes=60,
            max_capacity=20,
            is_active=True,
        )

    def test_class_code_is_auto_generated(self):
        other = ScheduleClass.objects.create(
            name="Pilates",
            default_duration_minutes=45,
            max_capacity=15,
            is_active=True,
        )
        self.assertTrue(self.schedule_class.class_code.startswith("CLS-"))
        self.assertTrue(other.class_code.startswith("CLS-"))
        self.assertNotEqual(self.schedule_class.class_code, other.class_code)

    def test_slot_validations(self):
        with self.assertRaises(ValidationError):
            ScheduleSlot.objects.create(
                schedule_class=self.schedule_class,
                trainer=self.trainer,
                weekday=0,
                start_time=time(10, 0),
                end_time=time(9, 0),
                effective_from=date(2026, 3, 1),
                effective_to=date(2026, 3, 2),
                is_active=True,
            )

        with self.assertRaises(ValidationError):
            ScheduleSlot.objects.create(
                schedule_class=self.schedule_class,
                trainer=self.trainer,
                weekday=0,
                start_time=time(9, 0),
                end_time=time(10, 0),
                effective_from=date(2026, 3, 10),
                effective_to=date(2026, 3, 1),
                is_active=True,
            )


class ScheduleAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_schedule_permissions()
        cls.admin_user = User.objects.create_user(
            username="schedule_admin",
            password="pass12345",
            role_name="admin",
        )
        cls.receptionist_user = User.objects.create_user(
            username="schedule_receptionist",
            password="pass12345",
            role_name="receptionist",
        )
        cls.viewer_user = User.objects.create_user(
            username="schedule_viewer",
            password="pass12345",
            role_name="viewer",
        )

    @classmethod
    def _seed_schedule_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="schedule",
                action=action,
                defaults={"description": f"Can {action} schedule"},
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
        self.classes_url = reverse("schedule:classes-list")
        self.slots_url = reverse("schedule:slots-list")
        self.trainer = self._create_trainer(
            first_name="Ahmed",
            last_name="Khan",
            mobile_number="0701000100",
        )
        self.other_trainer = self._create_trainer(
            first_name="Sara",
            last_name="Amini",
            mobile_number="0701000101",
        )
        self.schedule_class = ScheduleClass.objects.create(
            name="Morning Yoga",
            default_duration_minutes=60,
            max_capacity=25,
            is_active=True,
        )
        self.other_class = ScheduleClass.objects.create(
            name="Functional Training",
            default_duration_minutes=50,
            max_capacity=20,
            is_active=True,
        )
        self.slot = ScheduleSlot.objects.create(
            schedule_class=self.schedule_class,
            trainer=self.trainer,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(10, 0),
            effective_from=date(2026, 3, 1),
            effective_to=None,
            is_active=True,
        )

    def _create_trainer(self, first_name: str, last_name: str, mobile_number: str) -> Trainer:
        staff = Staff.objects.create(
            position="trainer",
            first_name=first_name,
            last_name=last_name,
            mobile_number=mobile_number,
            date_hired="2026-02-20",
            monthly_salary=Decimal("11000"),
            salary_status="paid",
            employment_status="active",
        )
        return Trainer.objects.create(staff=staff)

    def test_admin_can_create_class(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.classes_url,
            {
                "name": "Evening HIIT",
                "description": "High intensity interval training",
                "default_duration_minutes": 45,
                "max_capacity": 18,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("class_code", response.data)

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(user=self.viewer_user)

        list_response = self.client.get(self.classes_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            self.classes_url,
            {
                "name": "Blocked Class",
                "default_duration_minutes": 40,
                "max_capacity": 15,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_slot_success(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.slots_url,
            {
                "schedule_class": self.other_class.id,
                "trainer": self.other_trainer.id,
                "weekday": 0,
                "start_time": "10:00:00",
                "end_time": "11:00:00",
                "effective_from": "2026-03-01",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["class_name"], "Functional Training")

    def test_trainer_overlap_conflict_diagnostics(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.slots_url,
            {
                "schedule_class": self.other_class.id,
                "trainer": self.trainer.id,
                "weekday": 0,
                "start_time": "09:30:00",
                "end_time": "10:30:00",
                "effective_from": "2026-03-01",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("conflicts", response.data)
        self.assertTrue(
            any(conflict["reason"] == "trainer_overlap" for conflict in response.data["conflicts"])
        )

    def test_class_overlap_conflict_diagnostics(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            self.slots_url,
            {
                "schedule_class": self.schedule_class.id,
                "trainer": self.other_trainer.id,
                "weekday": 0,
                "start_time": "09:15:00",
                "end_time": "09:45:00",
                "effective_from": "2026-03-01",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("conflicts", response.data)
        self.assertTrue(
            any(conflict["reason"] == "class_overlap" for conflict in response.data["conflicts"])
        )

    def test_weekly_endpoint_filters(self):
        self.client.force_authenticate(user=self.admin_user)
        Member.objects.create(
            first_name="Active",
            last_name="Member",
            phone="0701000200",
            status="active",
            schedule_class=self.schedule_class,
            schedule_slot=self.slot,
        )
        Member.objects.create(
            first_name="Inactive",
            last_name="Member",
            phone="0701000201",
            status="inactive",
            schedule_class=self.schedule_class,
            schedule_slot=self.slot,
        )
        ScheduleSlot.objects.create(
            schedule_class=self.other_class,
            trainer=self.other_trainer,
            weekday=2,
            start_time=time(14, 0),
            end_time=time(15, 0),
            effective_from=date(2026, 3, 1),
            effective_to=None,
            is_active=True,
        )

        weekly_url = reverse("schedule:slots-weekly")
        response = self.client.get(
            weekly_url,
            {"week_start": "2026-03-02", "trainer_id": self.trainer.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["week_start"], "2026-03-02")

        total = sum(len(day["slots"]) for day in response.data["days"])
        self.assertEqual(total, 1)
        self.assertEqual(response.data["days"][0]["slots"][0]["trainer_id"], self.trainer.id)
        self.assertEqual(response.data["days"][0]["slots"][0]["active_member_count"], 1)

    def test_soft_delete_slot(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("schedule:slots-detail", kwargs={"pk": self.slot.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ScheduleSlot.objects.filter(id=self.slot.id).exists())
        self.assertTrue(ScheduleSlot.all_objects.filter(id=self.slot.id).exists())

    def test_delete_class_soft_deletes_related_slots(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse("schedule:classes-detail", kwargs={"pk": self.schedule_class.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(ScheduleClass.objects.filter(id=self.schedule_class.id).exists())
        self.assertTrue(ScheduleClass.all_objects.filter(id=self.schedule_class.id).exists())
        self.assertFalse(ScheduleSlot.objects.filter(id=self.slot.id).exists())
        self.assertTrue(ScheduleSlot.all_objects.filter(id=self.slot.id).exists())

    def test_receptionist_cannot_delete(self):
        self.client.force_authenticate(user=self.receptionist_user)
        detail_url = reverse("schedule:slots-detail", kwargs={"pk": self.slot.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_trainers_lookup_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("schedule:slots-trainers")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        self.assertIn("trainer_name", response.data[0])
