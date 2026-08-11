from datetime import date, datetime, timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission
from members.models import Member
from staff.models import Staff

from .models import MemberFeeCycle, MemberFeePayment, MemberFeePlan, StaffSalaryPayment, StaffSalaryPeriod


class PaymentsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_fee_permissions()
        cls.admin_user = User.objects.create_user(
            username="payments_admin", password="pass12345", role_name="admin"
        )
        cls.receptionist_user = User.objects.create_user(
            username="payments_reception", password="pass12345", role_name="receptionist"
        )
        cls.viewer_user = User.objects.create_user(
            username="payments_viewer", password="pass12345", role_name="viewer"
        )

    @classmethod
    def _seed_fee_permissions(cls):
        actions = ["view", "add", "change", "delete", "all"]
        permissions = {}
        for action in actions:
            permission, _ = Permission.objects.get_or_create(
                module="fees",
                action=action,
                defaults={"description": f"Can {action} fees"},
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
        self.member = Member.objects.create(
            first_name="Fee",
            last_name="Member",
            phone="0700001000",
            status="active",
        )
        self.plan = MemberFeePlan.objects.create(
            member=self.member,
            cycle_fee_amount=Decimal("2000.00"),
            default_cycle_discount_amount=Decimal("100.00"),
            currency="AFN",
            effective_from=date(2025, 1, 1),
        )
        self.staff = Staff.objects.create(
            position="trainer",
            first_name="Salary",
            last_name="Staff",
            mobile_number="0700002000",
            date_hired="2025-01-01",
            monthly_salary=Decimal("10000.00"),
            salary_currency="AFN",
            salary_status="unpaid",
            employment_status="active",
        )

        self.member_payment_list_url = reverse("payments:member-fee-payments-list")
        self.member_plan_list_url = reverse("payments:member-fee-plans-list")
        self.member_cycle_summary_url = reverse("payments:member-fee-cycles-summary")
        self.member_cycle_upsert_url = reverse("payments:member-fee-cycles-upsert")
        self.staff_payment_list_url = reverse("payments:staff-salary-payments-list")
        self.staff_period_summary_url = reverse("payments:staff-salary-periods-summary")
        self.staff_period_upsert_url = reverse("payments:staff-salary-periods-upsert")

    def test_member_cycle_calculation_on_payment_and_reversal(self):
        self.client.force_authenticate(user=self.admin_user)
        paid_at = timezone.now().isoformat()

        create_response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "500.00",
                "discount_amount": "100.00",
                "payment_method": "cash",
                "paid_at": paid_at,
                "note": "Initial collection",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        payment_id = create_response.data["id"]

        summary_response = self.client.get(
            self.member_cycle_summary_url, {"member_id": self.member.id}
        )
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(summary_response.data["current_cycle_remaining"]), Decimal("1300.00"))
        self.assertEqual(Decimal(summary_response.data["total_outstanding"]), Decimal("1300.00"))

        reverse_url = reverse("payments:member-fee-payments-reverse", kwargs={"pk": payment_id})
        reverse_response = self.client.post(reverse_url, {"reason": "Entry mistake"}, format="json")
        self.assertEqual(reverse_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(reverse_response.data["is_reversal"])

        summary_response = self.client.get(
            self.member_cycle_summary_url, {"member_id": self.member.id}
        )
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(summary_response.data["current_cycle_remaining"]), Decimal("1900.00"))
        self.assertEqual(Decimal(summary_response.data["total_outstanding"]), Decimal("1900.00"))

    def test_member_overpayment_is_blocked(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "2000.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount_paid", response.data)

    def test_member_reversal_cannot_happen_twice(self):
        self.client.force_authenticate(user=self.admin_user)
        create_response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "500.00",
                "discount_amount": "50.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        reverse_url = reverse(
            "payments:member-fee-payments-reverse", kwargs={"pk": create_response.data["id"]}
        )
        first_reverse = self.client.post(reverse_url, {"reason": "Wrong amount"}, format="json")
        self.assertEqual(first_reverse.status_code, status.HTTP_201_CREATED)

        second_reverse = self.client.post(reverse_url, {"reason": "Again"}, format="json")
        self.assertEqual(second_reverse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_salary_period_calculation_reversal_and_status_sync(self):
        self.client.force_authenticate(user=self.admin_user)

        upsert_response = self.client.post(
            self.staff_period_upsert_url,
            {
                "staff_id": self.staff.id,
                "period_month": timezone.localdate().replace(day=1).isoformat(),
            },
            format="json",
        )
        self.assertEqual(upsert_response.status_code, status.HTTP_200_OK)
        period_id = upsert_response.data["id"]

        create_response = self.client.post(
            self.staff_payment_list_url,
            {
                "staff_id": self.staff.id,
                "period_id": period_id,
                "amount_paid": "4000.00",
                "payment_method": "bank_transfer",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        self.staff.refresh_from_db()
        self.assertEqual(self.staff.salary_status, "partial")

        reverse_url = reverse(
            "payments:staff-salary-payments-reverse", kwargs={"pk": create_response.data["id"]}
        )
        reverse_response = self.client.post(reverse_url, {"reason": "Wrong transfer"}, format="json")
        self.assertEqual(reverse_response.status_code, status.HTTP_201_CREATED)

        self.staff.refresh_from_db()
        self.assertEqual(self.staff.salary_status, "unpaid")

    def test_salary_overpayment_is_blocked(self):
        self.client.force_authenticate(user=self.admin_user)
        period_response = self.client.post(
            self.staff_period_upsert_url,
            {
                "staff_id": self.staff.id,
                "period_month": timezone.localdate().replace(day=1).isoformat(),
            },
            format="json",
        )
        self.assertEqual(period_response.status_code, status.HTTP_200_OK)

        response = self.client.post(
            self.staff_payment_list_url,
            {
                "staff_id": self.staff.id,
                "period_id": period_response.data["id"],
                "amount_paid": "12000.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount_paid", response.data)

    def test_member_summary_returns_current_and_total_outstanding(self):
        self.client.force_authenticate(user=self.admin_user)

        previous_month = (timezone.localdate().replace(day=1) - timedelta(days=1)).replace(day=1)
        upsert_response = self.client.post(
            self.member_cycle_upsert_url,
            {
                "member_id": self.member.id,
                "cycle_month": previous_month.isoformat(),
            },
            format="json",
        )
        self.assertEqual(upsert_response.status_code, status.HTTP_200_OK)

        old_payment_response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "cycle_id": upsert_response.data["id"],
                "amount_paid": "900.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone
                .make_aware(datetime.combine(previous_month + timedelta(days=14), datetime.min.time()))
                .isoformat(),
            },
            format="json",
        )
        self.assertEqual(old_payment_response.status_code, status.HTTP_201_CREATED)

        summary_response = self.client.get(
            self.member_cycle_summary_url, {"member_id": self.member.id}
        )
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertIn("current_cycle", summary_response.data)
        self.assertIn("total_outstanding", summary_response.data)
        self.assertIn("outstanding_cycles", summary_response.data)
        self.assertGreaterEqual(summary_response.data["overdue_cycles_count"], 1)
        self.assertTrue(summary_response.data["has_fee_plan"])

    def test_member_payment_without_cycle_uses_oldest_outstanding_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        previous_month = (timezone.localdate().replace(day=1) - timedelta(days=1)).replace(day=1)
        current_month = timezone.localdate().replace(day=1)
        previous_cycle = MemberFeeCycle.objects.create(
            member=self.member,
            plan=self.plan,
            cycle_month=previous_month,
            base_due_amount=Decimal("2000.00"),
            cycle_discount_amount=Decimal("100.00"),
            net_due_amount=Decimal("1900.00"),
            paid_amount=Decimal("0.00"),
            payment_discount_amount=Decimal("0.00"),
            remaining_amount=Decimal("1900.00"),
            status="unpaid",
        )
        MemberFeeCycle.objects.create(
            member=self.member,
            plan=self.plan,
            cycle_month=current_month,
            base_due_amount=Decimal("2000.00"),
            cycle_discount_amount=Decimal("100.00"),
            net_due_amount=Decimal("1900.00"),
            paid_amount=Decimal("0.00"),
            payment_discount_amount=Decimal("0.00"),
            remaining_amount=Decimal("1900.00"),
            status="unpaid",
        )

        response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "900.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = MemberFeePayment.objects.get(pk=response.data["id"])
        self.assertEqual(payment.cycle_id, previous_cycle.id)

    def test_member_payment_without_cycle_splits_across_outstanding_cycles(self):
        self.client.force_authenticate(user=self.admin_user)
        two_months_ago = (
            timezone.localdate().replace(day=1) - timedelta(days=35)
        ).replace(day=1)
        previous_month = (timezone.localdate().replace(day=1) - timedelta(days=1)).replace(day=1)
        current_month = timezone.localdate().replace(day=1)
        self.member.join_date = two_months_ago
        self.member.save(update_fields=["join_date", "updated_at"])
        cycles = []
        for month, remaining in (
            (two_months_ago, Decimal("400.00")),
            (previous_month, Decimal("500.00")),
            (current_month, Decimal("1000.00")),
        ):
            cycles.append(
                MemberFeeCycle.objects.create(
                    member=self.member,
                    plan=self.plan,
                    cycle_month=month,
                    base_due_amount=remaining,
                    cycle_discount_amount=Decimal("0.00"),
                    net_due_amount=remaining,
                    paid_amount=Decimal("0.00"),
                    payment_discount_amount=Decimal("0.00"),
                    remaining_amount=remaining,
                    status="unpaid",
                )
            )

        response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "1700.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payments = MemberFeePayment.objects.filter(member=self.member).order_by("cycle__cycle_month")
        self.assertEqual([payment.amount_paid for payment in payments], [
            Decimal("400.00"),
            Decimal("500.00"),
            Decimal("800.00"),
        ])
        for cycle in cycles:
            cycle.refresh_from_db()
        self.assertEqual(cycles[0].remaining_amount, Decimal("0.00"))
        self.assertEqual(cycles[1].remaining_amount, Decimal("0.00"))
        self.assertEqual(cycles[2].remaining_amount, Decimal("200.00"))

    def test_member_summary_marks_missing_fee_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        member_without_plan = Member.objects.create(
            first_name="NoPlan",
            last_name="Member",
            phone="0700009999",
            status="active",
        )

        response = self.client.get(self.member_cycle_summary_url, {"member_id": member_without_plan.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_fee_plan"])
        self.assertIsNone(response.data["current_cycle"])
        self.assertEqual(Decimal(response.data["current_cycle_remaining"]), Decimal("0.00"))

    def test_member_payment_without_fee_plan_creates_ad_hoc_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        member_without_plan = Member.objects.create(
            first_name="Direct",
            last_name="Payment",
            phone="0700009897",
            status="active",
        )

        response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": member_without_plan.id,
                "amount_paid": "100.00",
                "discount_amount": "10.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cycle = MemberFeeCycle.objects.get(pk=response.data["cycle"])
        self.assertIsNone(cycle.plan)
        self.assertEqual(cycle.net_due_amount, Decimal("110.00"))
        self.assertEqual(cycle.remaining_amount, Decimal("0.00"))

    def test_member_fee_plan_duplicate_returns_400(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.member_plan_list_url,
            {
                "member": self.member.id,
                "billing_cycle": "monthly",
                "cycle_fee_amount": "2500.00",
                "default_cycle_discount_amount": "100.00",
                "currency": "AFN",
                "effective_from": "2026-03-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("member", response.data)

    def test_member_fee_plan_model_validation_returns_400(self):
        self.client.force_authenticate(user=self.admin_user)
        member_without_plan = Member.objects.create(
            first_name="InvalidPlan",
            last_name="Member",
            phone="0700009898",
            status="active",
        )

        response = self.client.post(
            self.member_plan_list_url,
            {
                "member": member_without_plan.id,
                "billing_cycle": "monthly",
                "cycle_fee_amount": "1000.00",
                "default_cycle_discount_amount": "1500.00",
                "currency": "AFN",
                "effective_from": "2026-03-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("default_cycle_discount_amount", response.data)

    def test_viewer_has_read_only_permissions(self):
        self.client.force_authenticate(user=self.viewer_user)

        list_response = self.client.get(
            self.member_payment_list_url, {"member_id": self.member.id}
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "100.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_repeated_posting_never_allows_negative_remaining(self):
        self.client.force_authenticate(user=self.admin_user)

        first = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "1000.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            self.member_payment_list_url,
            {
                "member_id": self.member.id,
                "amount_paid": "1000.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

        cycle = MemberFeeCycle.objects.filter(member=self.member).order_by("-cycle_month").first()
        self.assertIsNotNone(cycle)
        self.assertGreaterEqual(cycle.remaining_amount, Decimal("0.00"))

    def test_staff_summary_endpoint(self):
        self.client.force_authenticate(user=self.receptionist_user)
        month_start = timezone.localdate().replace(day=1)
        period = StaffSalaryPeriod.objects.create(
            staff=self.staff,
            period_month=month_start,
            gross_salary_amount=Decimal("10000.00"),
            paid_amount=Decimal("0.00"),
            remaining_amount=Decimal("10000.00"),
            status="unpaid",
            currency="AFN",
        )
        self.client.post(
            self.staff_payment_list_url,
            {
                "staff_id": self.staff.id,
                "period_id": period.id,
                "amount_paid": "7000.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )

        response = self.client.get(
            self.staff_period_summary_url,
            {
                "staff_id": self.staff.id,
                "period_month": month_start.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data["remaining_amount"]), Decimal("3000.00"))
        self.assertEqual(response.data["status"], "partial")
        self.assertIn("outstanding_periods", response.data)

    def test_salary_payment_without_period_uses_oldest_outstanding_period(self):
        self.client.force_authenticate(user=self.admin_user)
        previous_month = (timezone.localdate().replace(day=1) - timedelta(days=1)).replace(day=1)
        current_month = timezone.localdate().replace(day=1)
        self.staff.date_hired = previous_month
        self.staff.save(update_fields=["date_hired", "updated_at"])
        previous_period = StaffSalaryPeriod.objects.create(
            staff=self.staff,
            period_month=previous_month,
            gross_salary_amount=Decimal("10000.00"),
            paid_amount=Decimal("0.00"),
            remaining_amount=Decimal("10000.00"),
            status="unpaid",
            currency="AFN",
        )
        StaffSalaryPeriod.objects.create(
            staff=self.staff,
            period_month=current_month,
            gross_salary_amount=Decimal("10000.00"),
            paid_amount=Decimal("0.00"),
            remaining_amount=Decimal("10000.00"),
            status="unpaid",
            currency="AFN",
        )

        response = self.client.post(
            self.staff_payment_list_url,
            {
                "staff_id": self.staff.id,
                "amount_paid": "4000.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = StaffSalaryPayment.objects.get(pk=response.data["id"])
        self.assertEqual(payment.period_id, previous_period.id)

    def test_salary_payment_without_period_splits_across_outstanding_periods(self):
        self.client.force_authenticate(user=self.admin_user)
        two_months_ago = (
            timezone.localdate().replace(day=1) - timedelta(days=35)
        ).replace(day=1)
        previous_month = (timezone.localdate().replace(day=1) - timedelta(days=1)).replace(day=1)
        current_month = timezone.localdate().replace(day=1)
        self.staff.date_hired = two_months_ago
        self.staff.monthly_salary = Decimal("2000.00")
        self.staff.save(update_fields=["date_hired", "monthly_salary", "updated_at"])
        periods = []
        for month, already_paid in (
            (two_months_ago, Decimal("1600.00")),
            (previous_month, Decimal("1500.00")),
            (current_month, Decimal("1000.00")),
        ):
            period = StaffSalaryPeriod.objects.create(
                staff=self.staff,
                period_month=month,
                gross_salary_amount=Decimal("2000.00"),
                paid_amount=Decimal("0.00"),
                remaining_amount=Decimal("2000.00"),
                status="unpaid",
                currency="AFN",
            )
            StaffSalaryPayment.objects.create(
                staff=self.staff,
                period=period,
                amount_paid=already_paid,
                payment_method="cash",
                paid_at=timezone.now() - timedelta(days=10),
            )
            periods.append(period)

        response = self.client.post(
            self.staff_payment_list_url,
            {
                "staff_id": self.staff.id,
                "amount_paid": "1700.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
                "note": "allocation-test",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payments = StaffSalaryPayment.objects.filter(
            staff=self.staff, note="allocation-test"
        ).order_by("period__period_month")
        self.assertEqual([payment.amount_paid for payment in payments], [
            Decimal("400.00"),
            Decimal("500.00"),
            Decimal("800.00"),
        ])
        for period in periods:
            period.refresh_from_db()
        self.assertEqual(periods[0].remaining_amount, Decimal("0.00"))
        self.assertEqual(periods[1].remaining_amount, Decimal("0.00"))
        self.assertEqual(periods[2].remaining_amount, Decimal("200.00"))
