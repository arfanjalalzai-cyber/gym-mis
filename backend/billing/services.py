from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from members.models import Member
from payments.models import MemberFeeCycle, first_day_of_month
from payments.services import get_or_create_billable_member_cycle, recalculate_member_cycle
from schedule.models import ScheduleClass
from system_settings.models import BillingSettings

from .models import Bill


ZERO = Decimal("0.00")


def _to_decimal(value: Decimal | str | int | float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _full_name(member: Member) -> str:
    return f"{member.first_name} {member.last_name}".strip()


def _default_plan_label(cycle: MemberFeeCycle) -> str:
    if cycle.plan and cycle.plan.plan_template:
        template = cycle.plan.plan_template
        return f"{template.name} ({template.get_duration_type_display()})"
    if cycle.plan is None:
        return "Membership"
    return f"{cycle.plan.get_billing_cycle_display()} Membership"


def _get_locked_billing_settings() -> BillingSettings:
    settings_obj, _ = BillingSettings.all_objects.select_for_update().get_or_create(
        pk=BillingSettings.singleton_pk
    )
    if settings_obj.deleted_at is not None:
        settings_obj.deleted_at = None
        settings_obj.save(update_fields=["deleted_at", "updated_at"])
    return settings_obj


def _next_bill_number() -> str:
    settings_obj = _get_locked_billing_settings()
    next_sequence = settings_obj.invoice_next_sequence
    while True:
        candidate = f"{settings_obj.invoice_prefix}-{str(next_sequence).zfill(settings_obj.invoice_padding)}"
        if not Bill.all_objects.filter(bill_number=candidate).exists():
            settings_obj.invoice_next_sequence = next_sequence + 1
            settings_obj.save(update_fields=["invoice_next_sequence", "updated_at"])
            return candidate
        next_sequence += 1


def _validate_cycle_discount(cycle: MemberFeeCycle, requested_discount: Decimal):
    if requested_discount < ZERO:
        raise ValidationError({"discount_amount": "Discount amount must be greater than or equal to 0."})
    if requested_discount > cycle.base_due_amount:
        raise ValidationError(
            {"discount_amount": "Discount amount cannot exceed original fee amount."}
        )


def _sync_bill_fields_from_cycle(bill: Bill, cycle: MemberFeeCycle):
    total_discount = _to_decimal(
        Decimal(cycle.cycle_discount_amount) + Decimal(cycle.payment_discount_amount)
    )
    final_amount = _to_decimal(Decimal(cycle.base_due_amount) - total_discount)

    bill.member = cycle.member
    bill.cycle_month = cycle.cycle_month
    bill.member_code_snapshot = cycle.member.member_code
    bill.member_name_snapshot = _full_name(cycle.member)
    bill.original_fee_amount = cycle.base_due_amount
    # A payment discount reduces the same cycle balance as a bill-level discount,
    # so it must be represented on the statement as well.
    bill.discount_amount = total_discount
    bill.final_amount = final_amount
    bill.paid_amount = cycle.paid_amount
    bill.remaining_amount = cycle.remaining_amount
    bill.payment_status = cycle.status
    bill.currency = cycle.plan.currency

    bill.member_full_name_snapshot = _full_name(cycle.member)
    bill.member_status_snapshot = cycle.member.status
    if bill.schedule_class_id and bill.schedule_class:
        bill.class_name_snapshot = bill.schedule_class.name
    bill.plan_label_snapshot = (
        bill.class_name_snapshot.strip() if bill.class_name_snapshot.strip() else _default_plan_label(cycle)
    )


def generate_bill(
    *,
    member: Member,
    billing_date: date,
    discount_amount: Decimal | None = None,
    schedule_class: ScheduleClass | None = None,
) -> tuple[Bill, bool]:
    if member.status != "active":
        raise ValidationError({"member_id": "Inactive members cannot generate bills."})

    cycle_month = first_day_of_month(billing_date)
    requested_discount = _to_decimal(discount_amount) if discount_amount is not None else None

    with transaction.atomic():
        cycle = get_or_create_billable_member_cycle(
            member=member,
            cycle_month=cycle_month,
            cycle_discount_override=requested_discount,
        )
        cycle = MemberFeeCycle.objects.select_for_update().select_related("member", "plan", "plan__plan_template").get(
            pk=cycle.id
        )

        if requested_discount is not None and requested_discount != cycle.cycle_discount_amount:
            _validate_cycle_discount(cycle, requested_discount)
            if cycle.payments.exists():
                # Once payments exist for a cycle, discount changes are locked.
                # Keep the persisted cycle discount and continue bill generation.
                requested_discount = cycle.cycle_discount_amount
            else:
                cycle.cycle_discount_amount = requested_discount
                cycle.net_due_amount = cycle.base_due_amount - requested_discount
                cycle.remaining_amount = cycle.net_due_amount
                cycle.save(
                    update_fields=[
                        "cycle_discount_amount",
                        "net_due_amount",
                        "remaining_amount",
                        "updated_at",
                    ]
                )

        cycle = recalculate_member_cycle(cycle.id, sync_billing=False)

        bill = Bill.objects.select_for_update().filter(cycle_id=cycle.id).first()
        created = False
        if not bill:
            bill = Bill(
                bill_number=_next_bill_number(),
                member=member,
                cycle=cycle,
                billing_date=billing_date,
                cycle_month=cycle.cycle_month,
                member_code_snapshot=member.member_code,
                member_name_snapshot=_full_name(member),
                schedule_class=schedule_class,
                class_name_snapshot=schedule_class.name if schedule_class else "",
                original_fee_amount=cycle.base_due_amount,
                discount_amount=cycle.cycle_discount_amount,
                final_amount=cycle.net_due_amount,
                paid_amount=cycle.paid_amount,
                remaining_amount=cycle.remaining_amount,
                payment_status=cycle.status,
                currency=cycle.plan.currency,
                is_locked=False,
                member_full_name_snapshot=_full_name(member),
                member_status_snapshot=member.status,
                plan_label_snapshot=(
                    schedule_class.name if schedule_class else _default_plan_label(cycle)
                ),
            )
            created = True
        else:
            bill.billing_date = billing_date
            if schedule_class is not None:
                bill.schedule_class = schedule_class
                bill.class_name_snapshot = schedule_class.name

        _sync_bill_fields_from_cycle(bill, cycle)
        bill.save()
        return bill, created


def sync_bill_for_cycle(cycle_id: int) -> Bill | None:
    with transaction.atomic():
        cycle = (
            MemberFeeCycle.objects.select_related("member", "plan", "plan__plan_template")
            .filter(pk=cycle_id)
            .first()
        )
        if not cycle:
            return None

        bill = Bill.objects.select_for_update().filter(cycle_id=cycle_id).first()
        if not bill:
            return None

        _sync_bill_fields_from_cycle(bill, cycle)
        bill.save(
            update_fields=[
                "member",
                "cycle_month",
                "member_code_snapshot",
                "member_name_snapshot",
                "original_fee_amount",
                "discount_amount",
                "final_amount",
                "paid_amount",
                "remaining_amount",
                "payment_status",
                "currency",
                "is_locked",
                "member_full_name_snapshot",
                "member_status_snapshot",
                "class_name_snapshot",
                "plan_label_snapshot",
                "updated_at",
            ]
        )
        return bill


def ensure_bill_for_cycle(
    *, cycle_id: int, billing_date: date | None = None
) -> Bill | None:
    """Create a bill for a paid cycle when one does not already exist."""
    with transaction.atomic():
        cycle = (
            MemberFeeCycle.objects.select_for_update()
            .select_related("member", "plan", "plan__plan_template")
            .filter(pk=cycle_id)
            .first()
        )
        if not cycle or cycle.plan is None:
            return None

        bill = Bill.objects.select_for_update().filter(cycle_id=cycle.id).first()
        if bill:
            _sync_bill_fields_from_cycle(bill, cycle)
            bill.save()
            return bill

        bill = Bill(
            bill_number=_next_bill_number(),
            member=cycle.member,
            cycle=cycle,
            billing_date=billing_date or timezone.localdate(),
            cycle_month=cycle.cycle_month,
            member_full_name_snapshot=_full_name(cycle.member),
        )
        _sync_bill_fields_from_cycle(bill, cycle)
        bill.save()
        return bill


def get_billing_history_queryset():
    return Bill.objects.select_related("member", "cycle", "cycle__plan", "schedule_class")


def normalize_billing_date(value: date | None) -> date:
    return value or timezone.localdate()
