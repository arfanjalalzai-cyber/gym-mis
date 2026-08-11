from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from attendance.models import AttendanceRecord
from core.models import Permission
from members.models import Member
from payments.models import MemberFeeCycle, MemberFeePayment, MemberFeePlan
from staff.models import Staff

from .models import Expense, ExpenseCategory


def month_start_for(offset: int) -> date:
    base = timezone.localdate().replace(day=1)
    month_index = (base.year * 12 + (base.month - 1)) + offset
    year = month_index // 12
    month = (month_index % 12) + 1
    return date(year, month, 1)


def month_end_for(month_start: date) -> date:
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month - timedelta(days=1)


class ReportsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_reports_permissions()
        cls.admin_user = User.objects.create_user(
            username="reports_admin",
            password="pass12345",
            role_name="admin",
        )
        cls.receptionist_user = User.objects.create_user(
            username="reports_reception",
            password="pass12345",
            role_name="receptionist",
        )
        cls.viewer_user = User.objects.create_user(
            username="reports_viewer",
            password="pass12345",
            role_name="viewer",
        )

    @classmethod
    def _seed_reports_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="reports",
                action=action,
                defaults={"description": f"Can {action} reports"},
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
        self.active_paid_member = Member.objects.create(
            first_name="Active",
            last_name="Paid",
            phone="0700001001",
            status="active",
        )
        self.active_unpaid_member = Member.objects.create(
            first_name="Active",
            last_name="Unpaid",
            phone="0700001002",
            status="active",
        )
        self.inactive_unpaid_member = Member.objects.create(
            first_name="Inactive",
            last_name="Unpaid",
            phone="0700001003",
            status="inactive",
        )
        self.active_no_paid_member = Member.objects.create(
            first_name="Active",
            last_name="NoPlan",
            phone="0700001004",
            status="active",
        )

        self.active_paid_plan = MemberFeePlan.objects.create(
            member=self.active_paid_member,
            billing_cycle="monthly",
            cycle_fee_amount=Decimal("1000.00"),
            default_cycle_discount_amount=Decimal("0.00"),
            currency="AFN",
            effective_from=month_start_for(-2),
        )
        self.active_unpaid_plan = MemberFeePlan.objects.create(
            member=self.active_unpaid_member,
            billing_cycle="monthly",
            cycle_fee_amount=Decimal("1000.00"),
            default_cycle_discount_amount=Decimal("0.00"),
            currency="AFN",
            effective_from=month_start_for(-2),
        )
        self.inactive_unpaid_plan = MemberFeePlan.objects.create(
            member=self.inactive_unpaid_member,
            billing_cycle="monthly",
            cycle_fee_amount=Decimal("1000.00"),
            default_cycle_discount_amount=Decimal("0.00"),
            currency="AFN",
            effective_from=month_start_for(-2),
        )

        paid_month = month_start_for(-1)
        unpaid_month = month_start_for(0)

        self.paid_cycle = MemberFeeCycle.objects.create(
            member=self.active_paid_member,
            plan=self.active_paid_plan,
            cycle_month=paid_month,
            base_due_amount=Decimal("1000.00"),
            cycle_discount_amount=Decimal("0.00"),
            net_due_amount=Decimal("1000.00"),
            paid_amount=Decimal("1000.00"),
            payment_discount_amount=Decimal("0.00"),
            remaining_amount=Decimal("0.00"),
            status="paid",
        )
        self.unpaid_cycle = MemberFeeCycle.objects.create(
            member=self.active_unpaid_member,
            plan=self.active_unpaid_plan,
            cycle_month=unpaid_month,
            base_due_amount=Decimal("1000.00"),
            cycle_discount_amount=Decimal("0.00"),
            net_due_amount=Decimal("1000.00"),
            paid_amount=Decimal("300.00"),
            payment_discount_amount=Decimal("0.00"),
            remaining_amount=Decimal("700.00"),
            status="partial",
        )
        self.inactive_unpaid_cycle = MemberFeeCycle.objects.create(
            member=self.inactive_unpaid_member,
            plan=self.inactive_unpaid_plan,
            cycle_month=unpaid_month,
            base_due_amount=Decimal("1000.00"),
            cycle_discount_amount=Decimal("0.00"),
            net_due_amount=Decimal("1000.00"),
            paid_amount=Decimal("200.00"),
            payment_discount_amount=Decimal("0.00"),
            remaining_amount=Decimal("800.00"),
            status="partial",
        )

        self.payment_regular = MemberFeePayment.objects.create(
            member=self.active_paid_member,
            cycle=self.paid_cycle,
            amount_paid=Decimal("1000.00"),
            discount_amount=Decimal("0.00"),
            payment_method="cash",
            paid_at=timezone.now(),
            note="Regular payment",
            is_reversal=False,
            created_by=self.admin_user,
        )
        self.payment_for_unpaid_member = MemberFeePayment.objects.create(
            member=self.active_unpaid_member,
            cycle=self.unpaid_cycle,
            amount_paid=Decimal("500.00"),
            discount_amount=Decimal("0.00"),
            payment_method="card",
            paid_at=timezone.now(),
            note="Partial payment",
            is_reversal=False,
            created_by=self.admin_user,
        )
        self.payment_reversal = MemberFeePayment.objects.create(
            member=self.active_unpaid_member,
            cycle=self.unpaid_cycle,
            amount_paid=Decimal("-200.00"),
            discount_amount=Decimal("0.00"),
            payment_method="card",
            paid_at=timezone.now(),
            note="Reversal",
            is_reversal=True,
            reversal_of=self.payment_for_unpaid_member,
            created_by=self.admin_user,
        )
        self.staff_member = Staff.objects.create(
            position="trainer",
            first_name="Staff",
            last_name="Member",
            mobile_number="0700002001",
            date_hired=timezone.localdate() - timedelta(days=30),
            monthly_salary=Decimal("15000.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="active",
        )
        self.latest_attendance_record = AttendanceRecord.objects.create(
            staff=self.staff_member,
            attendance_date=timezone.localdate(),
            status="present",
            marked_by=self.admin_user,
        )

        Expense.objects.create(
            expense_name="Electricity Bill",
            amount=Decimal("1200.00"),
            expense_date=timezone.localdate() - timedelta(days=2),
            category="utilities",
            note="Monthly utility payment",
            created_by=self.admin_user,
        )
        self.latest_expense = Expense.objects.create(
            expense_name="Equipment Repair",
            amount=Decimal("450.00"),
            expense_date=timezone.localdate() - timedelta(days=1),
            category="maintenance",
            note="Treadmill repair",
            created_by=self.admin_user,
        )

        self.expenses_url = reverse("reports:expenses-list")
        self.expense_categories_url = reverse("reports:expense-categories-list")
        self.expense_recent_url = reverse("reports:expenses-recent")
        self.active_members_url = reverse("reports:active-members-report")
        self.unpaid_members_url = reverse("reports:unpaid-members-report")
        self.payment_history_url = reverse("reports:payment-history-report")
        self.monthly_income_url = reverse("reports:monthly-income-report")
        self.analytics_overview_url = reverse("reports:analytics-overview-report")
        self.dashboard_overview_url = reverse("reports:dashboard-overview")
        self.dashboard_activity_url = reverse("reports:dashboard-activity")
        self.dashboard_alerts_url = reverse("reports:dashboard-alerts")

    def test_expense_create_and_recent_list(self):
        self.client.force_authenticate(self.admin_user)

        recent_response = self.client.get(self.expense_recent_url, {"limit": 1})
        self.assertEqual(recent_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(recent_response.data), 1)
        self.assertEqual(recent_response.data[0]["id"], self.latest_expense.id)

        create_response = self.client.post(
            self.expenses_url,
            {
                "expense_name": "Gym Rent",
                "amount": "5000.00",
                "expense_date": timezone.localdate().isoformat(),
                "category": "rent",
                "note": "March rent",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["category"], "rent")

    def test_expense_category_create_and_use(self):
        self.client.force_authenticate(self.admin_user)

        category_response = self.client.post(
            self.expense_categories_url,
            {"name": "Zakat"},
            format="json",
        )
        self.assertEqual(category_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(category_response.data["slug"], "zakat")
        self.assertTrue(ExpenseCategory.objects.filter(slug="zakat").exists())

        create_response = self.client.post(
            self.expenses_url,
            {
                "expense_name": "Monthly zakat",
                "amount": "120000.00",
                "expense_date": timezone.localdate().isoformat(),
                "category": "zakat",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["category"], "zakat")

    def test_active_members_report_returns_only_active_with_expiry(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(self.active_members_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 2)

        by_member_id = {row["member_id"]: row for row in response.data["results"]}
        self.assertIn(self.active_paid_member.id, by_member_id)
        self.assertIn(self.active_unpaid_member.id, by_member_id)
        self.assertNotIn(self.inactive_unpaid_member.id, by_member_id)

        active_paid_row = by_member_id[self.active_paid_member.id]
        self.assertEqual(
            str(active_paid_row["membership_expiry_date"]),
            str(month_end_for(self.paid_cycle.cycle_month)),
        )

    def test_unpaid_members_report_excludes_inactive_members(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(self.unpaid_members_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        by_member_id = {row["member_id"]: row for row in response.data["results"]}
        self.assertIn(self.active_unpaid_member.id, by_member_id)
        self.assertNotIn(self.inactive_unpaid_member.id, by_member_id)
        self.assertEqual(by_member_id[self.active_unpaid_member.id]["remaining_balance"], "700.00")

    def test_payment_history_report_filters_and_reversal_flag(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(
            self.payment_history_url,
            {
                "member_id": self.active_unpaid_member.id,
                "payment_method": "card",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertTrue(any(row["is_reversal"] for row in response.data["results"]))

    def test_monthly_income_report_zero_filled_and_net_logic(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(self.monthly_income_url, {"months": 6})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 6)

        summary = response.data["summary"]
        self.assertEqual(Decimal(summary["gross_received"]), Decimal("1500.00"))
        self.assertEqual(Decimal(summary["reversal_total"]), Decimal("-200.00"))
        self.assertEqual(Decimal(summary["net_received"]), Decimal("1300.00"))
        self.assertGreaterEqual(summary["payment_count"], 2)
        self.assertTrue(any(Decimal(row["gross_received"]) == Decimal("0.00") for row in response.data["results"]))

    def test_analytics_overview_series_alignment(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(self.analytics_overview_url, {"months": 6})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        income_series = response.data["income_series"]
        expense_series = response.data["expense_series"]
        member_growth_series = response.data["member_growth_series"]

        self.assertEqual(len(income_series), 6)
        self.assertEqual(len(expense_series), 6)
        self.assertEqual(len(member_growth_series), 6)

        income_months = [row["month"] for row in income_series]
        expense_months = [row["month"] for row in expense_series]
        member_months = [row["month"] for row in member_growth_series]
        self.assertEqual(income_months, expense_months)
        self.assertEqual(income_months, member_months)

    def test_viewer_is_read_only_for_expenses(self):
        self.client.force_authenticate(self.viewer_user)
        list_response = self.client.get(self.expenses_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            self.expenses_url,
            {
                "expense_name": "Marketing",
                "amount": "300.00",
                "expense_date": timezone.localdate().isoformat(),
                "category": "marketing",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_cannot_delete_expense(self):
        self.client.force_authenticate(self.receptionist_user)
        expense = Expense.objects.first()
        detail_url = reverse("reports:expenses-detail", kwargs={"pk": expense.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_overview_response_and_months_validation(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self.dashboard_overview_url, {"months": 12})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currency"], "AFN")
        self.assertIn("key_statistics", response.data)
        self.assertIn("financial_overview", response.data)
        self.assertIn("charts", response.data)
        self.assertEqual(
            Decimal(response.data["financial_overview"]["pending_payments"]["total_amount"]),
            Decimal("700.00"),
        )
        self.assertEqual(
            response.data["financial_overview"]["pending_payments"]["member_count"], 1
        )

        invalid_response = self.client.get(self.dashboard_overview_url, {"months": 5})
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dashboard_alerts_expired_membership_includes_no_paid_cycle_member(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self.dashboard_alerts_url, {"limit": 50})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expired_by_member_id = {
            row["member_id"]: row for row in response.data["expired_membership_alerts"]
        }
        self.assertIn(self.active_no_paid_member.id, expired_by_member_id)
        self.assertIsNone(
            expired_by_member_id[self.active_no_paid_member.id]["membership_expiry_date"]
        )
        self.assertIsNone(expired_by_member_id[self.active_no_paid_member.id]["days_overdue"])

    def test_dashboard_activity_limit_and_ordering(self):
        self.client.force_authenticate(self.admin_user)

        newest_member = Member.objects.create(
            first_name="Recent",
            last_name="Member",
            phone="0700001999",
            status="active",
        )
        newest_payment = MemberFeePayment.objects.create(
            member=self.active_paid_member,
            cycle=self.paid_cycle,
            amount_paid=Decimal("250.00"),
            discount_amount=Decimal("0.00"),
            payment_method="cash",
            paid_at=timezone.now() + timedelta(minutes=1),
            note="Newest payment",
            is_reversal=False,
            created_by=self.admin_user,
        )
        newest_attendance = AttendanceRecord.objects.create(
            staff=self.staff_member,
            attendance_date=timezone.localdate() - timedelta(days=1),
            status="late",
            marked_by=self.admin_user,
        )

        response = self.client.get(self.dashboard_activity_url, {"limit": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["recent_member_registrations"]), 1)
        self.assertEqual(len(response.data["recent_payments"]), 1)
        self.assertEqual(len(response.data["recent_staff_attendance"]), 1)
        self.assertEqual(
            response.data["recent_member_registrations"][0]["member_id"], newest_member.id
        )
        self.assertEqual(response.data["recent_payments"][0]["payment_id"], newest_payment.id)
        self.assertEqual(
            response.data["recent_staff_attendance"][0]["record_id"], newest_attendance.id
        )

    def test_dashboard_alerts_totals_and_limits(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self.dashboard_alerts_url, {"limit": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data["expired_membership_alerts"]), 1)
        self.assertLessEqual(len(response.data["payment_due_alerts"]), 1)
        self.assertEqual(response.data["totals"]["payment_due_members"], 1)
        self.assertGreaterEqual(response.data["totals"]["expired_memberships"], 1)

    def test_dashboard_endpoints_auth_and_viewer_access(self):
        unauthenticated_response = self.client.get(self.dashboard_overview_url)
        self.assertIn(
            unauthenticated_response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

        self.client.force_authenticate(self.viewer_user)
        overview_response = self.client.get(self.dashboard_overview_url)
        activity_response = self.client.get(self.dashboard_activity_url)
        alerts_response = self.client.get(self.dashboard_alerts_url)

        self.assertEqual(overview_response.status_code, status.HTTP_200_OK)
        self.assertEqual(activity_response.status_code, status.HTTP_200_OK)
        self.assertEqual(alerts_response.status_code, status.HTTP_200_OK)
