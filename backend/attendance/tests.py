from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission
from payments.models import StaffSalaryPayment, StaffSalaryPeriod
from staff.models import Staff

from .models import AttendancePolicy, AttendanceRecord
from .services import calculate_payable_salary, validate_attendance_date, validate_leave_allowed


class AttendanceServiceTests(APITestCase):
    def setUp(self):
        self.staff = Staff.objects.create(
            position="manager",
            first_name="Service",
            last_name="Case",
            mobile_number="0700003111",
            date_hired="2026-01-01",
            monthly_salary=Decimal("2800.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="active",
        )

    def test_duplicate_record_disallowed(self):
        attendance_date = timezone.localdate() - timedelta(days=1)
        AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=attendance_date,
            status=AttendanceRecord.STATUS_PRESENT,
        )

        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                staff=self.staff,
                attendance_date=attendance_date,
                status=AttendanceRecord.STATUS_ABSENT,
            )

    def test_future_date_validation(self):
        future_date = timezone.localdate() + timedelta(days=1)
        with self.assertRaises(Exception):
            validate_attendance_date(future_date)

    def test_salary_calculation_with_mixed_statuses(self):
        month_start = timezone.localdate().replace(year=2026, month=2, day=1)
        AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=month_start,
            status=AttendanceRecord.STATUS_PRESENT,
        )
        AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=month_start + timedelta(days=1),
            status=AttendanceRecord.STATUS_LATE,
        )
        AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=month_start + timedelta(days=2),
            status=AttendanceRecord.STATUS_LEAVE,
        )

        metrics = calculate_payable_salary(self.staff, month_start)
        self.assertEqual(metrics["present_days"], 1)
        self.assertEqual(metrics["late_days"], 1)
        self.assertEqual(metrics["leave_days"], 1)
        self.assertEqual(metrics["missing_days"], 25)
        self.assertEqual(metrics["absent_days"], 0)
        self.assertEqual(metrics["salary_basis_days"], 28)
        self.assertEqual(metrics["base_salary"], Decimal("2800.00"))
        self.assertEqual(metrics["payable_salary"], Decimal("2750.00"))
        self.assertEqual(metrics["deduction_amount"], Decimal("50.00"))

    def test_salary_calculation_deducts_marked_absent_days(self):
        month_start = timezone.localdate().replace(year=2026, month=2, day=1)
        AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=month_start,
            status=AttendanceRecord.STATUS_ABSENT,
        )

        metrics = calculate_payable_salary(self.staff, month_start)
        self.assertEqual(metrics["absent_days"], 1)
        self.assertEqual(metrics["missing_days"], 27)
        self.assertEqual(metrics["payable_salary"], Decimal("2700.00"))
        self.assertEqual(metrics["deduction_amount"], Decimal("100.00"))

    def test_monthly_paid_leave_limit(self):
        policy = AttendancePolicy.get_solo()
        policy.leave_is_paid = True
        policy.monthly_paid_leave_days = 3
        policy.save()
        month_start = timezone.localdate().replace(year=2026, month=2, day=1)

        for day_offset in range(3):
            AttendanceRecord.objects.create(
                staff=self.staff,
                attendance_date=month_start + timedelta(days=day_offset),
                status=AttendanceRecord.STATUS_LEAVE,
            )

        metrics = calculate_payable_salary(self.staff, month_start)
        self.assertEqual(metrics["leave_days"], 3)
        self.assertEqual(metrics["payable_salary"], Decimal("2800.00"))

        with self.assertRaises(Exception):
            validate_leave_allowed(
                staff_id=self.staff.id,
                attendance_date=month_start + timedelta(days=3),
            )

    def test_salary_calculation_mid_month_hired(self):
        self.staff.date_hired = timezone.localdate().replace(year=2026, month=2, day=10)
        self.staff.save(update_fields=["date_hired", "updated_at"])
        month_start = timezone.localdate().replace(year=2026, month=2, day=1)

        metrics = calculate_payable_salary(self.staff, month_start)
        self.assertEqual(metrics["missing_days"], 19)
        self.assertEqual(metrics["absent_days"], 0)
        self.assertEqual(metrics["base_salary"], Decimal("2800.00"))
        self.assertEqual(metrics["payable_salary"], Decimal("2800.00"))

    def test_soft_deleted_record_can_be_recreated(self):
        attendance_date = timezone.localdate() - timedelta(days=2)
        record = AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=attendance_date,
            status=AttendanceRecord.STATUS_PRESENT,
        )
        record.soft_delete()

        recreated = AttendanceRecord.objects.create(
            staff=self.staff,
            attendance_date=attendance_date,
            status=AttendanceRecord.STATUS_ABSENT,
        )
        self.assertIsNotNone(recreated.id)


class AttendanceAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_attendance_permissions()
        cls.admin_user = User.objects.create_user(
            username="attendance_admin",
            password="pass12345",
            role_name="admin",
        )
        cls.receptionist_user = User.objects.create_user(
            username="attendance_reception",
            password="pass12345",
            role_name="receptionist",
        )
        cls.viewer_user = User.objects.create_user(
            username="attendance_viewer",
            password="pass12345",
            role_name="viewer",
        )

    @classmethod
    def _seed_attendance_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="attendance",
                action=action,
                defaults={"description": f"Can {action} attendance"},
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
        self.active_staff = Staff.objects.create(
            position="manager",
            first_name="Active",
            last_name="Staff",
            mobile_number="0700003222",
            date_hired="2026-01-01",
            monthly_salary=Decimal("3100.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="active",
        )
        self.on_leave_staff = Staff.objects.create(
            position="manager",
            first_name="Leave",
            last_name="Staff",
            mobile_number="0700003333",
            date_hired="2026-01-01",
            monthly_salary=Decimal("3000.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="on_leave",
        )
        self.inactive_staff = Staff.objects.create(
            position="cleaner",
            first_name="Inactive",
            last_name="Staff",
            mobile_number="0700003444",
            date_hired="2026-01-01",
            monthly_salary=Decimal("2000.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="inactive",
        )

        self.records_url = reverse("attendance:attendance-records-list")
        self.daily_sheet_url = reverse("attendance:attendance-records-daily-sheet")
        self.bulk_upsert_url = reverse("attendance:attendance-records-bulk-upsert")
        self.monthly_report_url = reverse("attendance:attendance-monthly-report")
        self.policy_url = reverse("attendance:attendance-policy")

    def test_daily_sheet_includes_required_staff_only(self):
        self.client.force_authenticate(self.admin_user)
        day = timezone.localdate() - timedelta(days=1)

        response = self.client.get(self.daily_sheet_url, {"date": day.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        staff_ids = {row["staff_id"] for row in response.data["results"]}
        self.assertIn(self.active_staff.id, staff_ids)
        self.assertIn(self.on_leave_staff.id, staff_ids)
        self.assertNotIn(self.inactive_staff.id, staff_ids)

    def test_bulk_upsert_only_saves_submitted_staff_entries(self):
        self.client.force_authenticate(self.admin_user)
        day = timezone.localdate() - timedelta(days=1)

        response = self.client.post(
            self.bulk_upsert_url,
            {
                "attendance_date": day.isoformat(),
                "entries": [
                    {
                        "staff_id": self.active_staff.id,
                        "status": AttendanceRecord.STATUS_PRESENT,
                        "note": "On time",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(AttendanceRecord.objects.filter(attendance_date=day).count(), 1)
        self.assertFalse(
            AttendanceRecord.objects.filter(
                staff=self.on_leave_staff, attendance_date=day
            ).exists()
        )

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(self.viewer_user)
        day = timezone.localdate() - timedelta(days=1)

        list_response = self.client.get(self.records_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            self.records_url,
            {
                "staff": self.active_staff.id,
                "attendance_date": day.isoformat(),
                "status": AttendanceRecord.STATUS_PRESENT,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_policy_get_and_patch(self):
        self.client.force_authenticate(self.receptionist_user)

        get_response = self.client.get(self.policy_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data["late_deduction_fraction"], "0.50")

        patch_response = self.client.patch(
            self.policy_url,
            {"late_deduction_enabled": False, "leave_is_paid": False},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        policy = AttendancePolicy.get_solo()
        self.assertFalse(policy.late_deduction_enabled)
        self.assertFalse(policy.leave_is_paid)

    def test_monthly_report_returns_totals(self):
        self.client.force_authenticate(self.admin_user)
        month_start = timezone.localdate().replace(year=2026, month=1, day=1)
        AttendanceRecord.objects.create(
            staff=self.active_staff,
            attendance_date=month_start,
            status=AttendanceRecord.STATUS_PRESENT,
        )
        AttendanceRecord.objects.create(
            staff=self.active_staff,
            attendance_date=month_start + timedelta(days=1),
            status=AttendanceRecord.STATUS_LATE,
        )

        response = self.client.get(self.monthly_report_url, {"month": "2026-01"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
        target_row = next(row for row in response.data["results"] if row["staff_id"] == self.active_staff.id)
        self.assertEqual(target_row["present_days"], 1)
        self.assertEqual(target_row["late_days"], 1)
        self.assertIn("payable_salary", target_row)

    def test_attendance_edit_after_full_payment_keeps_salary_period_valid(self):
        self.client.force_authenticate(self.admin_user)
        month_start = timezone.localdate().replace(year=2026, month=1, day=1)
        current = month_start
        while current.month == month_start.month:
            AttendanceRecord.objects.create(
                staff=self.active_staff,
                attendance_date=current,
                status=AttendanceRecord.STATUS_PRESENT,
            )
            current += timedelta(days=1)

        period = StaffSalaryPeriod.objects.create(
            staff=self.active_staff,
            period_month=month_start,
            gross_salary_amount=Decimal("3100.00"),
            paid_amount=Decimal("3100.00"),
            remaining_amount=Decimal("0.00"),
            status="paid",
            currency="AFN",
        )
        StaffSalaryPayment.objects.create(
            staff=self.active_staff,
            period=period,
            amount_paid=Decimal("3100.00"),
            payment_method="cash",
            paid_at=timezone.now(),
            note="Paid in full",
            is_reversal=False,
            reversal_of=None,
            created_by=self.admin_user,
        )

        record = AttendanceRecord.objects.filter(
            staff=self.active_staff, attendance_date=month_start
        ).first()
        detail_url = reverse("attendance:attendance-records-detail", kwargs={"pk": record.id})
        response = self.client.patch(
            detail_url,
            {"status": AttendanceRecord.STATUS_ABSENT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        record.refresh_from_db()
        self.assertEqual(record.status, AttendanceRecord.STATUS_ABSENT)
        period.refresh_from_db()
        self.assertEqual(period.gross_salary_amount, Decimal("3100.00"))
        self.assertEqual(period.remaining_amount, Decimal("0.00"))
