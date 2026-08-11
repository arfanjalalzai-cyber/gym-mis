from datetime import date, datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from members.models import Member
from staff.models import Staff

from .models import (
    MemberFeeCycle,
    MemberFeePayment,
    MemberFeePlan,
    StaffSalaryPayment,
    StaffSalaryPeriod,
    first_day_of_month,
)


ZERO = Decimal("0.00")
MONEY_PLACES = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(MONEY_PLACES)


def _sync_billing_for_cycle(cycle_id: int):
    # Keep payments app decoupled from billing app to avoid hard dependency loops.
    try:
        from billing.services import sync_bill_for_cycle

        sync_bill_for_cycle(cycle_id)
    except Exception:
        return


def _calculate_attendance_adjusted_gross(staff: Staff, period_month: date) -> Decimal:
    month_start = first_day_of_month(period_month)
    current_month_start = first_day_of_month(timezone.localdate())

    # Keep future months payable at base salary; current/past months use attendance to date.
    if month_start > current_month_start:
        return _money(Decimal(staff.monthly_salary))

    try:
        from attendance.services import calculate_payable_salary
        from attendance.models import AttendanceRecord
    except Exception:
        return _money(Decimal(staff.monthly_salary))

    try:
        if not AttendanceRecord.objects.filter(
            staff=staff,
            attendance_date__gte=month_start,
            attendance_date__lt=_add_months(month_start, 1),
        ).exists():
            return _money(Decimal(staff.monthly_salary))

        metrics = calculate_payable_salary(staff, month_start)
        payable_salary = _money(Decimal(str(metrics["payable_salary"])))
        return payable_salary
    except Exception:
        # Fallback to base salary if attendance module is not ready during migrations.
        return _money(Decimal(staff.monthly_salary))


def _to_month_start(value: date | datetime) -> date:
    if isinstance(value, datetime):
        return first_day_of_month(value.date())
    return first_day_of_month(value)


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _validate_plan_for_month(plan: MemberFeePlan, month_start: date):
    if plan.effective_from and month_start < first_day_of_month(plan.effective_from):
        raise ValidationError({"cycle_month": "Cycle month is before plan effective start date."})
    if plan.effective_to and month_start > first_day_of_month(plan.effective_to):
        raise ValidationError({"cycle_month": "Cycle month is after plan effective end date."})


def _member_cycle_status_from_remaining(net_due_amount: Decimal, remaining_amount: Decimal) -> str:
    if remaining_amount <= ZERO:
        return "paid"
    if remaining_amount >= net_due_amount:
        return "unpaid"
    return "partial"


def _staff_period_status_from_remaining(gross_salary: Decimal, remaining_amount: Decimal) -> str:
    if remaining_amount <= ZERO:
        return "paid"
    if remaining_amount >= gross_salary:
        return "unpaid"
    return "partial"


def get_or_create_member_cycle(
    member: Member,
    cycle_month: date,
    cycle_discount_override: Decimal | None = None,
) -> MemberFeeCycle:
    month_start = _to_month_start(cycle_month)
    plan = getattr(member, "fee_plan", None)
    if plan is None:
        raise ValidationError({"member_id": "No fee plan exists for the selected member."})

    _validate_plan_for_month(plan, month_start)

    cycle, created = MemberFeeCycle.objects.get_or_create(
        member=member,
        cycle_month=month_start,
        defaults={
            "plan": plan,
            "base_due_amount": plan.cycle_fee_amount,
            "cycle_discount_amount": (
                cycle_discount_override
                if cycle_discount_override is not None
                else plan.default_cycle_discount_amount
            ),
            "net_due_amount": plan.cycle_fee_amount
            - (
                cycle_discount_override
                if cycle_discount_override is not None
                else plan.default_cycle_discount_amount
            ),
            "paid_amount": ZERO,
            "payment_discount_amount": ZERO,
            "remaining_amount": plan.cycle_fee_amount
            - (
                cycle_discount_override
                if cycle_discount_override is not None
                else plan.default_cycle_discount_amount
            ),
            "status": "unpaid",
        },
    )

    if created:
        return cycle

    if cycle.plan_id != plan.id:
        cycle.plan = plan
        cycle.save(update_fields=["plan", "updated_at"])
    return cycle


def sync_member_fee_cycles_through(member: Member, through_month: date) -> list[MemberFeeCycle]:
    plan = getattr(member, "fee_plan", None)
    if plan is None:
        return []

    start_month = max(
        first_day_of_month(plan.effective_from),
        first_day_of_month(member.join_date),
    )
    end_month = _to_month_start(through_month)
    if plan.effective_to:
        end_month = min(end_month, first_day_of_month(plan.effective_to))
    if start_month > end_month:
        return []

    cycles = []
    cursor = start_month
    while cursor <= end_month:
        cycle = get_or_create_member_cycle(member=member, cycle_month=cursor)
        cycles.append(recalculate_member_cycle(cycle.id))
        cursor = _add_months(cursor, 1)
    return cycles


def get_or_create_billable_member_cycle(
    member: Member,
    cycle_month: date,
    cycle_discount_override: Decimal | None = None,
) -> MemberFeeCycle:
    """Return an older outstanding cycle when a plan has already expired."""
    month_start = _to_month_start(cycle_month)
    plan = getattr(member, "fee_plan", None)
    if plan and plan.effective_to and month_start > first_day_of_month(plan.effective_to):
        plan_end_month = first_day_of_month(plan.effective_to)
        sync_member_fee_cycles_through(member, plan_end_month)
        outstanding_cycle = (
            MemberFeeCycle.objects.filter(
                member=member,
                cycle_month__lte=plan_end_month,
                remaining_amount__gt=ZERO,
            )
            .order_by("cycle_month", "id")
            .first()
        )
        if outstanding_cycle:
            return outstanding_cycle

        # Older data may not have cycles created yet. In that case, use the
        # last month covered by the expired plan instead of attempting a new
        # cycle after the plan end date.
        return get_or_create_member_cycle(
            member=member,
            cycle_month=plan_end_month,
            cycle_discount_override=cycle_discount_override,
        )

    return get_or_create_member_cycle(
        member=member,
        cycle_month=month_start,
        cycle_discount_override=cycle_discount_override,
    )


def recalculate_member_cycle(cycle_id: int, *, sync_billing: bool = True) -> MemberFeeCycle:
    with transaction.atomic():
        cycle = MemberFeeCycle.objects.select_for_update().get(pk=cycle_id)
        aggregates = cycle.payments.aggregate(
            total_paid=Coalesce(Sum("amount_paid"), ZERO),
            total_discount=Coalesce(Sum("discount_amount"), ZERO),
        )

        paid_amount = _money(Decimal(aggregates["total_paid"]))
        payment_discount_amount = _money(Decimal(aggregates["total_discount"]))
        remaining_amount = _money(Decimal(cycle.net_due_amount) - paid_amount - payment_discount_amount)
        if remaining_amount < ZERO:
            raise ValidationError(
                {"amount_paid": "Payment and discount total cannot exceed cycle remaining amount."}
            )

        cycle.paid_amount = paid_amount
        cycle.payment_discount_amount = payment_discount_amount
        cycle.remaining_amount = remaining_amount
        cycle.status = _member_cycle_status_from_remaining(cycle.net_due_amount, remaining_amount)
        cycle.save(
            update_fields=[
                "paid_amount",
                "payment_discount_amount",
                "remaining_amount",
                "status",
                "updated_at",
            ]
        )
        if sync_billing:
            _sync_billing_for_cycle(cycle.id)
        return cycle


def _create_member_payment_entry(
    *,
    member: Member,
    cycle: MemberFeeCycle,
    amount_paid: Decimal,
    discount_amount: Decimal,
    payment_method: str,
    paid_at: datetime,
    note: str | None,
    created_by,
) -> MemberFeePayment:
    return MemberFeePayment.objects.create(
        member=member,
        cycle=cycle,
        amount_paid=amount_paid,
        discount_amount=discount_amount,
        payment_method=payment_method,
        paid_at=paid_at,
        note=note,
        is_reversal=False,
        reversal_of=None,
        created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
    )


def create_member_payment(
    *,
    member: Member,
    amount_paid: Decimal,
    discount_amount: Decimal,
    payment_method: str,
    paid_at: datetime,
    note: str | None,
    created_by,
    cycle_id: int | None = None,
) -> MemberFeePayment:
    amount_paid = _money(amount_paid)
    discount_amount = _money(discount_amount)
    if amount_paid < ZERO:
        raise ValidationError({"amount_paid": "Amount paid must be greater than or equal to 0."})
    if discount_amount < ZERO:
        raise ValidationError(
            {"discount_amount": "Discount amount must be greater than or equal to 0."}
        )
    if amount_paid == ZERO and discount_amount == ZERO:
        raise ValidationError(
            {"amount_paid": "Amount paid and discount amount cannot both be zero."}
        )

    with transaction.atomic():
        expand_ad_hoc_cycle_by = None
        if cycle_id:
            cycle = MemberFeeCycle.objects.select_for_update().get(pk=cycle_id)
            if cycle.member_id != member.id:
                raise ValidationError({"cycle_id": "Selected cycle does not belong to member."})
        else:
            month_start = _to_month_start(timezone.localtime(paid_at).date())
            plan = getattr(member, "fee_plan", None)
            if plan is None:
                ad_hoc_due_amount = amount_paid + discount_amount
                cycle, created = MemberFeeCycle.objects.get_or_create(
                    member=member,
                    cycle_month=month_start,
                    defaults={
                        "plan": None,
                        "base_due_amount": ad_hoc_due_amount,
                        "cycle_discount_amount": ZERO,
                        "net_due_amount": ad_hoc_due_amount,
                        "paid_amount": ZERO,
                        "payment_discount_amount": ZERO,
                        "remaining_amount": ad_hoc_due_amount,
                        "status": "unpaid",
                    },
                )
                if not created:
                    expand_ad_hoc_cycle_by = ad_hoc_due_amount
            else:
                sync_member_fee_cycles_through(member, month_start)
                cycle = (
                    MemberFeeCycle.objects.select_for_update()
                    .filter(
                        member=member,
                        cycle_month__lte=month_start,
                        remaining_amount__gt=ZERO,
                    )
                    .order_by("cycle_month", "id")
                    .first()
                )
                if cycle is None:
                    cycle = get_or_create_billable_member_cycle(member, month_start)
            cycle = MemberFeeCycle.objects.select_for_update().get(pk=cycle.id)

        if expand_ad_hoc_cycle_by is not None and cycle.plan_id is None:
            cycle.base_due_amount += expand_ad_hoc_cycle_by
            cycle.net_due_amount += expand_ad_hoc_cycle_by
            cycle.remaining_amount += expand_ad_hoc_cycle_by
            cycle.save(
                update_fields=[
                    "base_due_amount",
                    "net_due_amount",
                    "remaining_amount",
                    "updated_at",
                ]
            )

        if cycle_id or expand_ad_hoc_cycle_by is not None or cycle.plan_id is None:
            cycles = [recalculate_member_cycle(cycle.id)]
        else:
            cycles = list(
                MemberFeeCycle.objects.select_for_update()
                .filter(
                    member=member,
                    cycle_month__lte=month_start,
                    remaining_amount__gt=ZERO,
                )
                .order_by("cycle_month", "id")
            )
            cycles = [recalculate_member_cycle(item.id) for item in cycles]

        total_remaining = _money(sum((cycle.remaining_amount for cycle in cycles), ZERO))
        applied_total = amount_paid + discount_amount
        if applied_total > total_remaining:
            raise ValidationError(
                {"amount_paid": "Payment and discount exceed total outstanding fee amount."}
            )

        paid_left = amount_paid
        discount_left = discount_amount
        first_payment = None
        for target_cycle in cycles:
            if paid_left <= ZERO and discount_left <= ZERO:
                break

            remaining = _money(target_cycle.remaining_amount)
            paid_for_cycle = _money(min(paid_left, remaining))
            paid_left = _money(paid_left - paid_for_cycle)
            remaining = _money(remaining - paid_for_cycle)

            discount_for_cycle = _money(min(discount_left, remaining))
            discount_left = _money(discount_left - discount_for_cycle)

            if paid_for_cycle == ZERO and discount_for_cycle == ZERO:
                continue

            payment = _create_member_payment_entry(
                member=member,
                cycle=target_cycle,
                amount_paid=paid_for_cycle,
                discount_amount=discount_for_cycle,
                payment_method=payment_method,
                paid_at=paid_at,
                note=note,
                created_by=created_by,
            )
            recalculate_member_cycle(target_cycle.id)
            # Payments for older unpaid cycles must remain printable and traceable.
            # Generate the missing cycle invoice using the collection date.
            from billing.services import ensure_bill_for_cycle

            ensure_bill_for_cycle(
                cycle_id=target_cycle.id,
                billing_date=timezone.localtime(paid_at).date(),
            )
            if first_payment is None:
                first_payment = payment

        if first_payment is None:
            raise ValidationError({"amount_paid": "No outstanding fee amount was available."})
        return first_payment


def reverse_member_payment(
    *,
    payment_id: int,
    reason: str | None,
    created_by,
) -> MemberFeePayment:
    with transaction.atomic():
        payment = MemberFeePayment.objects.select_for_update().get(pk=payment_id)
        if payment.is_reversal:
            raise ValidationError({"detail": "A reversal payment cannot be reversed again."})
        if hasattr(payment, "reversal_entry"):
            raise ValidationError({"detail": "Payment has already been reversed."})

        reversal = MemberFeePayment.objects.create(
            member=payment.member,
            cycle=payment.cycle,
            amount_paid=-payment.amount_paid,
            discount_amount=-payment.discount_amount,
            payment_method=payment.payment_method,
            paid_at=timezone.now(),
            note=reason or "Reversal entry",
            is_reversal=True,
            reversal_of=payment,
            created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
        )
        recalculate_member_cycle(payment.cycle_id)
        return reversal


def get_or_create_staff_period(staff: Staff, period_month: date) -> StaffSalaryPeriod:
    month_start = _to_month_start(period_month)
    adjusted_gross = _money(_calculate_attendance_adjusted_gross(staff, month_start))
    period, created = StaffSalaryPeriod.objects.get_or_create(
        staff=staff,
        period_month=month_start,
        defaults={
            "gross_salary_amount": adjusted_gross,
            "paid_amount": ZERO,
            "remaining_amount": adjusted_gross,
            "status": "unpaid",
            "currency": "AFN",
        },
    )
    if not created and period.gross_salary_amount != adjusted_gross:
        period.gross_salary_amount = adjusted_gross
        remaining_amount = _money(adjusted_gross - Decimal(period.paid_amount))
        if remaining_amount < ZERO:
            raise ValidationError(
                {"detail": "Attendance-adjusted salary is below already paid salary for this period."}
            )
        period.remaining_amount = remaining_amount
        period.status = _staff_period_status_from_remaining(adjusted_gross, remaining_amount)
        period.save(
            update_fields=["gross_salary_amount", "remaining_amount", "status", "updated_at"]
        )
    return period


def sync_staff_salary_periods_through(staff: Staff, through_month: date) -> list[StaffSalaryPeriod]:
    start_month = first_day_of_month(staff.date_hired)
    end_month = _to_month_start(through_month)
    if start_month > end_month:
        return []

    periods = []
    cursor = start_month
    while cursor <= end_month:
        period = get_or_create_staff_period(staff=staff, period_month=cursor)
        periods.append(recalculate_staff_period(period.id))
        cursor = _add_months(cursor, 1)
    return periods


def sync_staff_salary_status(staff_id: int):
    staff = Staff.all_objects.filter(pk=staff_id, deleted_at__isnull=True).first()
    if staff is None:
        return
    current_month = first_day_of_month(timezone.localdate())
    period = (
        StaffSalaryPeriod.objects.filter(staff_id=staff.id, period_month=current_month)
        .order_by("-id")
        .first()
    )
    target_status = period.status if period else "unpaid"
    if staff.salary_status != target_status:
        staff.salary_status = target_status
        staff.save(update_fields=["salary_status", "updated_at"])


def recalculate_staff_period(period_id: int) -> StaffSalaryPeriod:
    with transaction.atomic():
        period = StaffSalaryPeriod.objects.select_for_update().get(pk=period_id)
        adjusted_gross = _money(_calculate_attendance_adjusted_gross(period.staff, period.period_month))
        aggregates = period.payments.aggregate(total_paid=Coalesce(Sum("amount_paid"), ZERO))
        paid_amount = _money(Decimal(aggregates["total_paid"]))
        if paid_amount > adjusted_gross:
            adjusted_gross = paid_amount
        remaining_amount = _money(adjusted_gross - paid_amount)

        period.gross_salary_amount = adjusted_gross
        period.paid_amount = paid_amount
        period.remaining_amount = remaining_amount
        period.status = _staff_period_status_from_remaining(
            adjusted_gross, remaining_amount
        )
        period.save(
            update_fields=[
                "gross_salary_amount",
                "paid_amount",
                "remaining_amount",
                "status",
                "updated_at",
            ]
        )
        sync_staff_salary_status(period.staff_id)
        return period


def _create_staff_salary_payment_entry(
    *,
    staff: Staff,
    period: StaffSalaryPeriod,
    amount_paid: Decimal,
    payment_method: str,
    paid_at: datetime,
    note: str | None,
    created_by,
) -> StaffSalaryPayment:
    return StaffSalaryPayment.objects.create(
        staff=staff,
        period=period,
        amount_paid=amount_paid,
        payment_method=payment_method,
        paid_at=paid_at,
        note=note,
        is_reversal=False,
        reversal_of=None,
        created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
    )


def create_staff_salary_payment(
    *,
    staff: Staff,
    amount_paid: Decimal,
    payment_method: str,
    paid_at: datetime,
    note: str | None,
    created_by,
    period_id: int | None = None,
) -> StaffSalaryPayment:
    amount_paid = _money(amount_paid)
    if amount_paid <= ZERO:
        raise ValidationError({"amount_paid": "Amount paid must be greater than 0."})

    with transaction.atomic():
        if period_id:
            period = StaffSalaryPeriod.objects.select_for_update().get(pk=period_id)
            if period.staff_id != staff.id:
                raise ValidationError({"period_id": "Selected period does not belong to staff."})
        else:
            month_start = _to_month_start(timezone.localtime(paid_at).date())
            sync_staff_salary_periods_through(staff, month_start)
            period = (
                StaffSalaryPeriod.objects.select_for_update()
                .filter(
                    staff=staff,
                    period_month__lte=month_start,
                    remaining_amount__gt=ZERO,
                )
                .order_by("period_month", "id")
                .first()
            )
            if period is None:
                period = get_or_create_staff_period(staff, month_start)
            period = StaffSalaryPeriod.objects.select_for_update().get(pk=period.id)

        if period_id:
            periods = [recalculate_staff_period(period.id)]
        else:
            periods = list(
                StaffSalaryPeriod.objects.select_for_update()
                .filter(
                    staff=staff,
                    period_month__lte=month_start,
                    remaining_amount__gt=ZERO,
                )
                .order_by("period_month", "id")
            )
            periods = [recalculate_staff_period(item.id) for item in periods]

        total_remaining = _money(sum((period.remaining_amount for period in periods), ZERO))
        if amount_paid > total_remaining:
            raise ValidationError(
                {
                    "amount_paid": (
                        f"Payment cannot be more than the remaining salary balance "
                        f"({total_remaining} AFN)."
                    )
                }
            )

        paid_left = amount_paid
        first_payment = None
        for target_period in periods:
            if paid_left <= ZERO:
                break

            paid_for_period = _money(min(paid_left, target_period.remaining_amount))
            paid_left = _money(paid_left - paid_for_period)
            if paid_for_period == ZERO:
                continue

            payment = _create_staff_salary_payment_entry(
                staff=staff,
                period=target_period,
                amount_paid=paid_for_period,
                payment_method=payment_method,
                paid_at=paid_at,
                note=note,
                created_by=created_by,
            )
            recalculate_staff_period(target_period.id)
            if first_payment is None:
                first_payment = payment

        if first_payment is None:
            raise ValidationError({"amount_paid": "No outstanding salary amount was available."})
        return first_payment


def reverse_staff_salary_payment(
    *,
    payment_id: int,
    reason: str | None,
    created_by,
) -> StaffSalaryPayment:
    with transaction.atomic():
        payment = StaffSalaryPayment.objects.select_for_update().get(pk=payment_id)
        if payment.is_reversal:
            raise ValidationError({"detail": "A reversal payment cannot be reversed again."})
        if hasattr(payment, "reversal_entry"):
            raise ValidationError({"detail": "Payment has already been reversed."})

        reversal = StaffSalaryPayment.objects.create(
            staff=payment.staff,
            period=payment.period,
            amount_paid=-payment.amount_paid,
            payment_method=payment.payment_method,
            paid_at=timezone.now(),
            note=reason or "Reversal entry",
            is_reversal=True,
            reversal_of=payment,
            created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
        )
        recalculate_staff_period(payment.period_id)
        return reversal
