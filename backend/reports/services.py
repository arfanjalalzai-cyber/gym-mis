from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Min, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from attendance.models import AttendanceRecord
from members.models import Member
from payments.models import MemberFeeCycle, MemberFeePayment
from staff.models import Staff

from .models import Expense


ZERO = Decimal("0.00")


def first_day_of_month(value: date) -> date:
    return value.replace(day=1)


def last_day_of_month(value: date) -> date:
    next_month_start = shift_month(first_day_of_month(value), 1)
    return next_month_start - timedelta(days=1)


def shift_month(value: date, offset: int) -> date:
    month_index = (value.year * 12 + (value.month - 1)) + offset
    year = month_index // 12
    month = (month_index % 12) + 1
    return date(year, month, 1)


def normalize_month_value(value) -> date | None:
    if value is None:
        return None
    if hasattr(value, "date"):
        return value.date().replace(day=1)
    if isinstance(value, date):
        return value.replace(day=1)
    if isinstance(value, str):
        return date.fromisoformat(value[:10]).replace(day=1)
    return None


def month_label(month_start: date) -> str:
    return month_start.strftime("%Y-%m")


def build_month_range(months: int, reference_date: date | None = None) -> tuple[date, date]:
    today = reference_date or timezone.localdate()
    to_month = first_day_of_month(today)
    from_month = shift_month(to_month, -(months - 1))
    return from_month, to_month


def iter_month_starts(from_month: date, to_month: date):
    current = from_month
    while current <= to_month:
        yield current
        current = shift_month(current, 1)


def build_income_monthly_report(months: int) -> dict:
    from_month, to_month = build_month_range(months)
    range_end = last_day_of_month(to_month)

    monthly_rows = (
        MemberFeePayment.objects.filter(
            paid_at__date__gte=from_month,
            paid_at__date__lte=range_end,
        )
        .annotate(month=TruncMonth("paid_at"))
        .values("month")
        .annotate(
            gross_received=Coalesce(
                Sum("amount_paid", filter=Q(is_reversal=False)),
                ZERO,
            ),
            reversals=Coalesce(
                Sum("amount_paid", filter=Q(is_reversal=True)),
                ZERO,
            ),
            payment_count=Count("id", filter=Q(is_reversal=False)),
        )
    )

    by_month: dict[date, dict] = {}
    for row in monthly_rows:
        month_start = normalize_month_value(row.get("month"))
        if month_start is None:
            continue
        gross_received = Decimal(row.get("gross_received") or ZERO)
        reversals = Decimal(row.get("reversals") or ZERO)
        payment_count = int(row.get("payment_count") or 0)
        by_month[month_start] = {
            "gross_received": gross_received,
            "reversals": reversals,
            "net_received": gross_received + reversals,
            "payment_count": payment_count,
        }

    results = []
    for month_start in iter_month_starts(from_month, to_month):
        existing = by_month.get(month_start)
        if existing is None:
            existing = {
                "gross_received": ZERO,
                "reversals": ZERO,
                "net_received": ZERO,
                "payment_count": 0,
            }
        results.append({"month": month_label(month_start), **existing})

    gross_received_total = sum((row["gross_received"] for row in results), ZERO)
    reversal_total = sum((row["reversals"] for row in results), ZERO)
    net_received_total = sum((row["net_received"] for row in results), ZERO)
    payment_count_total = sum((row["payment_count"] for row in results), 0)

    return {
        "range": {
            "from_month": month_label(from_month),
            "to_month": month_label(to_month),
        },
        "summary": {
            "gross_received": gross_received_total,
            "reversal_total": reversal_total,
            "net_received": net_received_total,
            "payment_count": payment_count_total,
        },
        "results": results,
    }


def build_expense_series(months: int) -> list[dict]:
    from_month, to_month = build_month_range(months)
    range_end = last_day_of_month(to_month)

    monthly_rows = (
        Expense.objects.filter(expense_date__gte=from_month, expense_date__lte=range_end)
        .annotate(month=TruncMonth("expense_date"))
        .values("month")
        .annotate(
            expenses=Coalesce(
                Sum("amount", filter=Q(transaction_type=Expense.TRANSACTION_EXPENSE)),
                ZERO,
            ),
            returns=Coalesce(
                Sum("amount", filter=Q(transaction_type=Expense.TRANSACTION_RETURN)),
                ZERO,
            ),
        )
    )
    by_month: dict[date, Decimal] = {}
    for row in monthly_rows:
        month_start = normalize_month_value(row.get("month"))
        if month_start is None:
            continue
        expenses = Decimal(row.get("expenses") or ZERO)
        returns = Decimal(row.get("returns") or ZERO)
        by_month[month_start] = expenses - returns

    results = []
    for month_start in iter_month_starts(from_month, to_month):
        results.append(
            {
                "month": month_label(month_start),
                "value": by_month.get(month_start, ZERO),
            }
        )
    return results


def build_member_growth_series(months: int) -> list[dict]:
    from_month, to_month = build_month_range(months)
    range_end = last_day_of_month(to_month)

    baseline_count = Member.objects.filter(join_date__lt=from_month).count()
    monthly_rows = (
        Member.objects.filter(join_date__gte=from_month, join_date__lte=range_end)
        .annotate(month=TruncMonth("join_date"))
        .values("month")
        .annotate(new_members=Count("id"))
    )
    by_month: dict[date, int] = {}
    for row in monthly_rows:
        month_start = normalize_month_value(row.get("month"))
        if month_start is None:
            continue
        by_month[month_start] = int(row.get("new_members") or 0)

    cumulative = baseline_count
    results = []
    for month_start in iter_month_starts(from_month, to_month):
        new_members = by_month.get(month_start, 0)
        cumulative += new_members
        results.append(
            {
                "month": month_label(month_start),
                "new_members": new_members,
                "cumulative_members": cumulative,
            }
        )
    return results


def build_analytics_overview(months: int) -> dict:
    income_report = build_income_monthly_report(months)
    income_series = [
        {
            "month": row["month"],
            "value": row["net_received"],
        }
        for row in income_report["results"]
    ]
    return {
        "income_series": income_series,
        "expense_series": build_expense_series(months),
        "member_growth_series": build_member_growth_series(months),
    }


def build_current_month_expense_total() -> Decimal:
    month_start = first_day_of_month(timezone.localdate())
    month_end = last_day_of_month(month_start)
    totals = Expense.objects.filter(
        expense_date__gte=month_start,
        expense_date__lte=month_end,
    ).aggregate(
        expenses=Coalesce(
            Sum("amount", filter=Q(transaction_type=Expense.TRANSACTION_EXPENSE)),
            ZERO,
        ),
        returns=Coalesce(
            Sum("amount", filter=Q(transaction_type=Expense.TRANSACTION_RETURN)),
            ZERO,
        ),
    )
    return Decimal(totals.get("expenses") or ZERO) - Decimal(totals.get("returns") or ZERO)


def build_total_unpaid_members_balance() -> Decimal:
    return (
        _members_with_remaining_balance()
        .filter(remaining_balance__gt=ZERO)
        .aggregate(total=Coalesce(Sum("remaining_balance"), ZERO))["total"]
        or ZERO
    )


def _members_with_remaining_balance(status: str | None = None):
    queryset = Member.objects.all()
    if status is not None:
        queryset = queryset.filter(status=status)
    return queryset.annotate(
        remaining_balance=Coalesce(
            Sum("fee_cycles__remaining_amount", filter=Q(fee_cycles__remaining_amount__gt=0)),
            ZERO,
        )
    )


def build_active_members_count() -> int:
    return Member.objects.filter(status="active").count()


def build_inactive_members_count() -> int:
    return Member.objects.filter(status="inactive").count()


def build_member_status_counts() -> dict:
    active_members = build_active_members_count()
    inactive_members = build_inactive_members_count()
    return {
        "active_members": active_members,
        "inactive_members": inactive_members,
        "total_members": Member.objects.count(),
    }


def build_unpaid_members_count() -> int:
    return _members_with_remaining_balance().filter(remaining_balance__gt=ZERO).count()


def build_total_members_count() -> int:
    return Member.objects.count()


def build_total_staff_count() -> int:
    return Staff.objects.count()


def build_today_income_total() -> Decimal:
    today = timezone.localdate()
    return (
        MemberFeePayment.objects.filter(paid_at__date=today).aggregate(
            total=Coalesce(Sum("amount_paid"), ZERO)
        )["total"]
        or ZERO
    )


def build_current_month_income_total() -> Decimal:
    month_start = first_day_of_month(timezone.localdate())
    month_end = last_day_of_month(month_start)
    return (
        MemberFeePayment.objects.filter(
            paid_at__date__gte=month_start,
            paid_at__date__lte=month_end,
        ).aggregate(total=Coalesce(Sum("amount_paid"), ZERO))["total"]
        or ZERO
    )


def build_today_attendance_count() -> int:
    today = timezone.localdate()
    return AttendanceRecord.objects.filter(
        attendance_date=today,
        status__in=[AttendanceRecord.STATUS_PRESENT, AttendanceRecord.STATUS_LATE],
    ).count()


def build_pending_payments_summary() -> dict:
    queryset = _members_with_remaining_balance().filter(remaining_balance__gt=ZERO)
    total_amount = (
        queryset.aggregate(total=Coalesce(Sum("remaining_balance"), ZERO))["total"] or ZERO
    )
    return {
        "total_amount": total_amount,
        "member_count": queryset.count(),
    }


def _get_membership_expiry_date(latest_paid_cycle_month) -> date | None:
    if latest_paid_cycle_month is None:
        return None
    month_start = normalize_month_value(latest_paid_cycle_month)
    if month_start is None:
        return None
    return last_day_of_month(month_start)


def _iter_expired_memberships():
    today = timezone.localdate()
    latest_paid_cycle_month = (
        MemberFeeCycle.objects.filter(member_id=OuterRef("pk"), status="paid")
        .order_by("-cycle_month")
        .values("cycle_month")[:1]
    )
    queryset = (
        Member.objects.filter(status="active")
        .annotate(latest_paid_cycle_month=Subquery(latest_paid_cycle_month))
        .only("id", "member_code", "first_name", "last_name")
    )
    for member in queryset:
        membership_expiry_date = _get_membership_expiry_date(
            getattr(member, "latest_paid_cycle_month", None)
        )
        if membership_expiry_date is not None and membership_expiry_date >= today:
            continue
        days_overdue = (
            (today - membership_expiry_date).days
            if membership_expiry_date is not None
            else None
        )
        yield {
            "member_id": member.id,
            "member_code": member.member_code,
            "member_name": f"{member.first_name} {member.last_name}".strip(),
            "membership_expiry_date": membership_expiry_date,
            "days_overdue": days_overdue,
        }


def build_expired_memberships(limit: int | None = None) -> dict:
    all_rows = list(_iter_expired_memberships())
    all_rows.sort(
        key=lambda row: (
            row["days_overdue"] is None,
            -(row["days_overdue"] or 0),
            row["member_name"],
            row["member_id"],
        )
    )
    return {
        "total": len(all_rows),
        "results": all_rows[:limit] if limit is not None else all_rows,
    }


def build_dashboard_overview(months: int) -> dict:
    analytics = build_analytics_overview(months)
    member_counts = build_member_status_counts()
    pending_payments = build_pending_payments_summary()
    current_month_income = build_current_month_income_total()
    current_month_expense = build_current_month_expense_total()
    expired_memberships = build_expired_memberships()
    expense_by_month = {row["month"]: row["value"] for row in analytics["expense_series"]}
    expense_vs_income = [
        {
            "month": row["month"],
            "income": row["value"],
            "expense": expense_by_month.get(row["month"], ZERO),
        }
        for row in analytics["income_series"]
    ]

    return {
        "generated_at": timezone.now(),
        "currency": "AFN",
        "key_statistics": {
            "total_members": member_counts["total_members"],
            "active_members": member_counts["active_members"],
            "inactive_members": member_counts["inactive_members"],
            "unpaid_members": pending_payments["member_count"],
            "expired_members": expired_memberships["total"],
            "total_staff": build_total_staff_count(),
            "monthly_income": current_month_income,
            "monthly_expense": current_month_expense,
            "net_monthly_profit": current_month_income - current_month_expense,
            "today_attendance": build_today_attendance_count(),
        },
        "financial_overview": {
            "today_income": build_today_income_total(),
            "monthly_income": current_month_income,
            "pending_payments": pending_payments,
        },
        "charts": {
            "member_growth": analytics["member_growth_series"],
            "monthly_income": analytics["income_series"],
            "expense_vs_income": expense_vs_income,
        },
    }


def build_dashboard_activity(limit: int) -> dict:
    recent_members = (
        Member.objects.order_by("-created_at", "-id")
        .only("id", "member_code", "first_name", "last_name", "join_date", "created_at")[:limit]
    )
    recent_payments = (
        MemberFeePayment.objects.select_related("member")
        .order_by("-paid_at", "-id")
        .only(
            "id",
            "member_id",
            "member__first_name",
            "member__last_name",
            "amount_paid",
            "payment_method",
            "is_reversal",
            "paid_at",
        )[:limit]
    )
    recent_staff_attendance = (
        AttendanceRecord.objects.select_related("staff", "marked_by")
        .order_by("-updated_at", "-id")
        .only(
            "id",
            "staff_id",
            "staff__staff_code",
            "staff__first_name",
            "staff__last_name",
            "attendance_date",
            "status",
            "marked_by__username",
            "updated_at",
        )[:limit]
    )

    return {
        "recent_member_registrations": [
            {
                "member_id": member.id,
                "member_code": member.member_code,
                "member_name": f"{member.first_name} {member.last_name}".strip(),
                "join_date": member.join_date,
                "created_at": member.created_at,
            }
            for member in recent_members
        ],
        "recent_payments": [
            {
                "payment_id": payment.id,
                "member_id": payment.member_id,
                "member_name": f"{payment.member.first_name} {payment.member.last_name}".strip(),
                "amount": payment.amount_paid,
                "payment_method": payment.payment_method,
                "is_reversal": payment.is_reversal,
                "paid_at": payment.paid_at,
            }
            for payment in recent_payments
        ],
        "recent_staff_attendance": [
            {
                "record_id": record.id,
                "staff_id": record.staff_id,
                "staff_code": record.staff.staff_code,
                "staff_name": f"{record.staff.first_name} {record.staff.last_name}".strip(),
                "attendance_date": record.attendance_date,
                "status": record.status,
                "marked_by_username": getattr(record.marked_by, "username", None),
                "updated_at": record.updated_at,
            }
            for record in recent_staff_attendance
        ],
    }


def build_dashboard_alerts(limit: int) -> dict:
    expired_memberships = build_expired_memberships(limit=limit)
    payment_due_queryset = (
        Member.objects.filter(status="active")
        .annotate(
            remaining_balance=Coalesce(
                Sum("fee_cycles__remaining_amount", filter=Q(fee_cycles__remaining_amount__gt=0)),
                ZERO,
            ),
            outstanding_cycles_count=Count("fee_cycles", filter=Q(fee_cycles__remaining_amount__gt=0)),
            oldest_unpaid_cycle_month=Min(
                "fee_cycles__cycle_month", filter=Q(fee_cycles__remaining_amount__gt=0)
            ),
        )
        .filter(remaining_balance__gt=ZERO)
        .order_by("-remaining_balance", "last_name", "first_name", "id")
    )
    payment_due_total = payment_due_queryset.count()

    return {
        "expired_membership_alerts": expired_memberships["results"],
        "payment_due_alerts": [
            {
                "member_id": member.id,
                "member_code": member.member_code,
                "member_name": f"{member.first_name} {member.last_name}".strip(),
                "remaining_balance": member.remaining_balance,
                "oldest_unpaid_cycle_month": member.oldest_unpaid_cycle_month,
                "outstanding_cycles_count": member.outstanding_cycles_count,
            }
            for member in payment_due_queryset[:limit]
        ],
        "totals": {
            "expired_memberships": expired_memberships["total"],
            "payment_due_members": payment_due_total,
        },
    }
