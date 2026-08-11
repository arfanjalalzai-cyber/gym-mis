from datetime import date
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User
from core.models import Permission
from members.models import Member
from payments.models import MemberFeePlan
from schedule.models import ScheduleClass
from system_settings.models import BillingSettings


class BillingAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_fee_permissions()
        cls.admin_user = User.objects.create_user(
            username="billing_admin", password="pass12345", role_name="admin"
        )
        cls.receptionist_user = User.objects.create_user(
            username="billing_reception", password="pass12345", role_name="receptionist"
        )
        cls.viewer_user = User.objects.create_user(
            username="billing_viewer", password="pass12345", role_name="viewer"
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
            first_name="Bill",
            last_name="Member",
            phone="0700001100",
            status="active",
        )
        self.plan = MemberFeePlan.objects.create(
            member=self.member,
            cycle_fee_amount=Decimal("2000.00"),
            default_cycle_discount_amount=Decimal("100.00"),
            currency="AFN",
            effective_from=date(2025, 1, 1),
        )
        self.schedule_class = ScheduleClass.objects.create(
            name="Functional Class",
            description="Core training",
            default_duration_minutes=60,
            is_active=True,
        )

        self.generate_url = reverse("billing:bills-generate")
        self.list_url = reverse("billing:bills-list")
        self.payment_url = reverse("payments:member-fee-payments-list")

    def _generate(self, payload: dict):
        return self.client.post(self.generate_url, payload, format="json")

    def test_generate_bill_success(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self._generate(
            {
                "member_id": self.member.id,
                "billing_date": "2026-03-10",
                "discount_amount": "150.00",
                "schedule_class_id": self.schedule_class.id,
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["payment_status"], "unpaid")
        self.assertEqual(Decimal(response.data["original_fee_amount"]), Decimal("2000.00"))
        self.assertEqual(Decimal(response.data["discount_amount"]), Decimal("150.00"))
        self.assertEqual(Decimal(response.data["final_amount"]), Decimal("1850.00"))
        self.assertEqual(response.data["membership_plan_or_class"], "Functional Class")

    def test_generate_bill_uses_billing_settings_invoice_sequence(self):
        self.client.force_authenticate(user=self.admin_user)
        settings_obj = BillingSettings.get_solo()
        settings_obj.invoice_prefix = "INV"
        settings_obj.invoice_padding = 4
        settings_obj.invoice_next_sequence = 7
        settings_obj.save()

        response = self._generate(
            {
                "member_id": self.member.id,
                "billing_date": "2026-03-10",
                "discount_amount": "150.00",
            }
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["bill_number"], "INV-0007")
        settings_obj.refresh_from_db()
        self.assertEqual(settings_obj.invoice_next_sequence, 8)

    def test_generate_bill_missing_plan_returns_400(self):
        self.client.force_authenticate(user=self.admin_user)
        no_plan_member = Member.objects.create(
            first_name="No",
            last_name="Plan",
            phone="0700001900",
            status="active",
        )

        response = self._generate(
            {"member_id": no_plan_member.id, "billing_date": "2026-03-01", "discount_amount": "50.00"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("member_id", response.data)

    def test_inactive_member_cannot_generate_bill(self):
        self.client.force_authenticate(user=self.admin_user)
        self.member.status = "inactive"
        self.member.save(update_fields=["status", "updated_at"])

        response = self._generate(
            {
                "member_id": self.member.id,
                "billing_date": "2026-03-10",
                "discount_amount": "150.00",
            }
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("member_id", response.data)
        self.assertEqual(response.data["member_id"][0], "Inactive members cannot generate bills.")

    def test_generate_bill_is_idempotent_for_same_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}

        first = self._generate(payload)
        second = self._generate(payload)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(first.data["bill_number"], second.data["bill_number"])

    def test_discount_change_after_payments_keeps_existing_discount(self):
        self.client.force_authenticate(user=self.admin_user)

        created = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        payment = self.client.post(
            self.payment_url,
            {
                "member_id": self.member.id,
                "cycle_id": created.data["cycle_id"],
                "amount_paid": "300.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(payment.status_code, status.HTTP_201_CREATED)

        changed = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-15", "discount_amount": "200.00"}
        )
        self.assertIn(changed.status_code, {status.HTTP_200_OK, status.HTTP_201_CREATED})
        self.assertEqual(Decimal(changed.data["discount_amount"]), Decimal("100.00"))

    def test_payment_sync_updates_bill_status(self):
        self.client.force_authenticate(user=self.admin_user)

        created = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        payment = self.client.post(
            self.payment_url,
            {
                "member_id": self.member.id,
                "cycle_id": created.data["cycle_id"],
                "amount_paid": "500.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(payment.status_code, status.HTTP_201_CREATED)

        detail = self.client.get(reverse("billing:bills-detail", kwargs={"pk": created.data["id"]}))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["payment_status"], "partial")

    def test_bill_includes_payment_discount_and_all_months_outstanding_balance(self):
        self.client.force_authenticate(user=self.admin_user)

        march_bill = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        april_bill = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-04-01", "discount_amount": "100.00"}
        )
        self.assertEqual(march_bill.status_code, status.HTTP_201_CREATED)
        self.assertEqual(april_bill.status_code, status.HTTP_201_CREATED)

        payment = self.client.post(
            self.payment_url,
            {
                "member_id": self.member.id,
                "cycle_id": march_bill.data["cycle_id"],
                "amount_paid": "500.00",
                "discount_amount": "200.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        self.assertEqual(payment.status_code, status.HTTP_201_CREATED)

        detail = self.client.get(reverse("billing:bills-detail", kwargs={"pk": march_bill.data["id"]}))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(detail.data["discount_amount"]), Decimal("300.00"))
        self.assertEqual(Decimal(detail.data["final_amount"]), Decimal("1700.00"))
        self.assertEqual(Decimal(detail.data["remaining_amount"]), Decimal("1200.00"))
        self.assertEqual(Decimal(detail.data["total_outstanding_amount"]), Decimal("3100.00"))
        self.assertEqual(Decimal(detail.data["total_paid_amount"]), Decimal("500.00"))
        self.assertEqual(Decimal(detail.data["total_discount_amount"]), Decimal("400.00"))

    def test_payment_for_previous_month_creates_missing_bill(self):
        self.client.force_authenticate(user=self.admin_user)

        payment = self.client.post(
            self.payment_url,
            {
                "member_id": self.member.id,
                "amount_paid": "500.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": "2026-03-15T09:00:00+04:30",
            },
            format="json",
        )
        self.assertEqual(payment.status_code, status.HTTP_201_CREATED)

        bills = self.client.get(self.list_url, {"member_id": self.member.id})
        self.assertEqual(bills.status_code, status.HTTP_200_OK)
        self.assertEqual(bills.data["count"], 1)

        detail = self.client.get(reverse("billing:bills-detail", kwargs={"pk": bills.data["results"][0]["id"]}))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["cycle_month"], "2026-03-01")
        self.assertEqual(detail.data["billing_date"], "2026-03-15")

    def test_expired_plan_uses_oldest_outstanding_cycle_for_new_bill(self):
        self.client.force_authenticate(user=self.admin_user)
        self.member.join_date = date(2026, 1, 1)
        self.member.save(update_fields=["join_date", "updated_at"])
        self.plan.effective_to = date(2026, 3, 31)
        self.plan.save(update_fields=["effective_to", "updated_at"])

        response = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-08-01", "discount_amount": "100.00"}
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cycle_month"], "2026-01-01")
        self.assertEqual(response.data["billing_date"], "2026-08-01")

    def test_expired_plan_without_existing_cycles_uses_plan_end_month(self):
        self.client.force_authenticate(user=self.admin_user)
        self.plan.effective_to = date(2026, 3, 31)
        self.plan.save(update_fields=["effective_to", "updated_at"])

        response = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-08-01", "discount_amount": "100.00"}
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cycle_month"], "2026-03-01")

    def test_payment_reversal_sync_updates_bill_status(self):
        self.client.force_authenticate(user=self.admin_user)

        created = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        payment = self.client.post(
            self.payment_url,
            {
                "member_id": self.member.id,
                "cycle_id": created.data["cycle_id"],
                "amount_paid": "500.00",
                "discount_amount": "0.00",
                "payment_method": "cash",
                "paid_at": timezone.now().isoformat(),
            },
            format="json",
        )
        reverse_url = reverse("payments:member-fee-payments-reverse", kwargs={"pk": payment.data["id"]})
        reverse_response = self.client.post(reverse_url, {"reason": "Mistake"}, format="json")
        self.assertEqual(reverse_response.status_code, status.HTTP_201_CREATED)

        detail = self.client.get(reverse("billing:bills-detail", kwargs={"pk": created.data["id"]}))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["payment_status"], "unpaid")

    def test_history_filters(self):
        self.client.force_authenticate(user=self.admin_user)

        second_member = Member.objects.create(
            first_name="Second",
            last_name="Member",
            phone="0700002200",
            status="active",
        )
        MemberFeePlan.objects.create(
            member=second_member,
            cycle_fee_amount=Decimal("1500.00"),
            default_cycle_discount_amount=Decimal("0.00"),
            currency="AFN",
            effective_from=date(2025, 1, 1),
        )

        first_bill = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        second_bill = self._generate(
            {"member_id": second_member.id, "billing_date": "2026-02-15", "discount_amount": "0.00"}
        )
        self.assertEqual(first_bill.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_bill.status_code, status.HTTP_201_CREATED)

        by_member = self.client.get(self.list_url, {"member_id": second_member.id})
        self.assertEqual(by_member.status_code, status.HTTP_200_OK)
        self.assertEqual(by_member.data["count"], 1)

        by_date = self.client.get(
            self.list_url,
            {"billing_date_from": "2026-03-01", "billing_date_to": "2026-03-31"},
        )
        self.assertEqual(by_date.status_code, status.HTTP_200_OK)
        self.assertEqual(by_date.data["count"], 1)

        by_search = self.client.get(self.list_url, {"search": first_bill.data["bill_number"]})
        self.assertEqual(by_search.status_code, status.HTTP_200_OK)
        self.assertEqual(by_search.data["count"], 1)

    def test_permissions(self):
        self.client.force_authenticate(user=self.viewer_user)
        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.receptionist_user)
        receptionist_response = self._generate(
            {"member_id": self.member.id, "billing_date": "2026-03-01", "discount_amount": "100.00"}
        )
        self.assertIn(
            receptionist_response.status_code,
            {status.HTTP_200_OK, status.HTTP_201_CREATED},
        )
