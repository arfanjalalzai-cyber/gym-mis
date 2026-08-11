from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from staff.models import Staff

from .models import AttendancePolicy, AttendanceRecord


ZERO = Decimal("0.00")


def first_day_of_month(value: date) -> date:
    return value.replace(day=1)


def last_day_of_month(value: date) -> date:
    return value.replace(day=monthrange(value.year, value.month)[1])


def get_attendance_policy() -> AttendancePolicy:
    return AttendancePolicy.get_solo()


def validate_attendance_date(attendance_date: date):
    policy = get_attendance_policy()
    today = timezone.localdate()
    if policy.block_future_dates and attendance_date > today:
        raise ValidationError({"attendance_date": "Future attendance dates are not allowed."})


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _required_staff_queryset(attendance_date: date):
    return Staff.objects.filter(
        employment_status__in=["active", "on_leave"],
        date_hired__lte=attendance_date,
    ).order_by("last_name", "first_name", "id")


def _leave_limit_message() -> str:
    return "Monthly paid leave limit reached. Mark this staff as Absent."


def count_monthly_leave_days(
    *,
    staff_id: int,
    attendance_date: date,
    exclude_record_id: int | None = None,
) -> int:
    month_start = first_day_of_month(attendance_date)
    month_end = last_day_of_month(attendance_date)
    queryset = AttendanceRecord.objects.filter(
        staff_id=staff_id,
        attendance_date__gte=month_start,
        attendance_date__lte=month_end,
        status=AttendanceRecord.STATUS_LEAVE,
    )
    if exclude_record_id is not None:
        queryset = queryset.exclude(id=exclude_record_id)
    return queryset.count()


def get_leave_limit_state(
    *,
    staff_id: int,
    attendance_date: date,
    current_record: AttendanceRecord | None = None,
) -> dict:
    policy = get_attendance_policy()
    monthly_allowance = int(policy.monthly_paid_leave_days or 0) if policy.leave_is_paid else 0
    leave_days_used = count_monthly_leave_days(
        staff_id=staff_id,
        attendance_date=attendance_date,
        exclude_record_id=current_record.id if current_record else None,
    )
    is_currently_leave = current_record is not None and current_record.status == AttendanceRecord.STATUS_LEAVE
    can_mark_leave = is_currently_leave or leave_days_used < monthly_allowance
    remaining_paid_leave_days = max(monthly_allowance - leave_days_used, 0)

    return {
        "monthly_paid_leave_days": monthly_allowance,
        "leave_days_used": leave_days_used,
        "remaining_paid_leave_days": remaining_paid_leave_days,
        "can_mark_leave": can_mark_leave,
        "leave_limit_message": None if can_mark_leave else _leave_limit_message(),
    }


def validate_leave_allowed(
    *,
    staff_id: int,
    attendance_date: date,
    exclude_record_id: int | None = None,
):
    policy = get_attendance_policy()
    monthly_allowance = int(policy.monthly_paid_leave_days or 0) if policy.leave_is_paid else 0
    leave_days_used = count_monthly_leave_days(
        staff_id=staff_id,
        attendance_date=attendance_date,
        exclude_record_id=exclude_record_id,
    )
    if leave_days_used >= monthly_allowance:
        raise ValidationError({"status": _leave_limit_message()})


def build_daily_sheet(attendance_date: date) -> list[dict]:
    validate_attendance_date(attendance_date)
    staff_list = list(_required_staff_queryset(attendance_date))
    records = AttendanceRecord.objects.select_related("marked_by").filter(
        attendance_date=attendance_date,
        staff_id__in=[staff.id for staff in staff_list],
    )
    by_staff = {record.staff_id: record for record in records}

    rows: list[dict] = []
    for staff in staff_list:
        record = by_staff.get(staff.id)
        leave_limit = get_leave_limit_state(
            staff_id=staff.id,
            attendance_date=attendance_date,
            current_record=record,
        )
        rows.append(
            {
                "record_id": record.id if record else None,
                "staff_id": staff.id,
                "staff_code": staff.staff_code,
                "staff_name": f"{staff.first_name} {staff.last_name}".strip(),
                "position": staff.position,
                "attendance_date": attendance_date,
                "is_recorded": record is not None,
                "status": record.status if record else AttendanceRecord.STATUS_ABSENT,
                "note": record.note if record else None,
                "marked_by": record.marked_by_id if record else None,
                "marked_by_username": (
                    getattr(record.marked_by, "username", None) if record else None
                ),
                "updated_at": record.updated_at if record else None,
                **leave_limit,
            }
        )
    return rows


def _validate_bulk_entries(
    *,
    attendance_date: date,
    entries: list[dict],
) -> dict[int, dict]:
    required_staff_ids = set(
        _required_staff_queryset(attendance_date).values_list("id", flat=True)
    )
    parsed: dict[int, dict] = {}

    for entry in entries:
        staff_id = entry["staff_id"]
        if staff_id in parsed:
            raise ValidationError({"entries": f"Duplicate staff_id found in payload: {staff_id}."})
        if staff_id not in required_staff_ids:
            raise ValidationError({"entries": f"Staff {staff_id} is not required for this date."})
        parsed[staff_id] = entry

    return parsed


def _sync_salary_periods_for_month(*, staff_ids: list[int], attendance_date: date):
    if not staff_ids:
        return

    try:
        from payments.models import StaffSalaryPeriod
        from payments.services import recalculate_staff_period
    except Exception:
        return

    month_start = first_day_of_month(attendance_date)
    periods = StaffSalaryPeriod.objects.filter(
        staff_id__in=staff_ids,
        period_month=month_start,
    ).order_by("id")

    for period in periods:
        recalculate_staff_period(period.id)


def sync_salary_for_record(record: AttendanceRecord, previous: tuple[int, date] | None = None):
    staff_ids = {record.staff_id}
    with transaction.atomic():
        _sync_salary_periods_for_month(staff_ids=list(staff_ids), attendance_date=record.attendance_date)
        if previous is not None:
            previous_staff_id, previous_date = previous
            if previous_staff_id != record.staff_id or previous_date != record.attendance_date:
                _sync_salary_periods_for_month(
                    staff_ids=[previous_staff_id], attendance_date=previous_date
                )


def sync_salary_for_deleted_record(*, staff_id: int, attendance_date: date):
    _sync_salary_periods_for_month(staff_ids=[staff_id], attendance_date=attendance_date)


def bulk_upsert_daily_attendance(
    *,
    attendance_date: date,
    entries: list[dict],
    marked_by,
) -> list[AttendanceRecord]:
    validate_attendance_date(attendance_date)
    parsed_entries = _validate_bulk_entries(attendance_date=attendance_date, entries=entries)
    required_staff = list(_required_staff_queryset(attendance_date))
    required_staff_ids = [staff.id for staff in required_staff]

    with transaction.atomic():
        existing_records = AttendanceRecord.objects.filter(
            attendance_date=attendance_date,
            staff_id__in=required_staff_ids,
        )
        existing_by_staff = {record.staff_id: record for record in existing_records}
        saved_records: list[AttendanceRecord] = []

        for staff_id, payload in parsed_entries.items():
            status = payload["status"]
            note = payload.get("note")
            note = note.strip() if isinstance(note, str) else note
            note = note or None

            current = existing_by_staff.get(staff_id)
            if status == AttendanceRecord.STATUS_LEAVE:
                validate_leave_allowed(
                    staff_id=staff_id,
                    attendance_date=attendance_date,
                    exclude_record_id=current.id if current else None,
                )
            if current is None:
                current = AttendanceRecord.objects.create(
                    staff_id=staff_id,
                    attendance_date=attendance_date,
                    status=status,
                    note=note,
                    marked_by=marked_by if getattr(marked_by, "is_authenticated", False) else None,
                )
            else:
                current.status = status
                current.note = note
                current.marked_by = marked_by if getattr(marked_by, "is_authenticated", False) else None
                current.save(update_fields=["status", "note", "marked_by", "updated_at"])

            saved_records.append(current)

        _sync_salary_periods_for_month(staff_ids=list(parsed_entries.keys()), attendance_date=attendance_date)
        return saved_records


def calculate_payable_salary(staff: Staff, month_start: date) -> dict:
    policy = get_attendance_policy()
    month_start = first_day_of_month(month_start)
    month_end = last_day_of_month(month_start)
    today = timezone.localdate()
    current_month_start = first_day_of_month(today)

    if month_start > current_month_start:
        period_end = month_start - timedelta(days=1)
    elif month_start == current_month_start:
        period_end = today
    else:
        period_end = month_end

    hired_date = staff.date_hired
    if isinstance(hired_date, str):
        hired_date = date.fromisoformat(hired_date)
    required_start = max(month_start, hired_date)

    salary_basis_days = monthrange(month_start.year, month_start.month)[1]
    covered_end = month_end
    covered_days = 0
    present_days = 0
    absent_days = 0
    late_days = 0
    leave_days = 0
    missing_days = 0

    if required_start <= covered_end:
        covered_days = (covered_end - required_start).days + 1

    if required_start <= period_end:
        status_counts = (
            AttendanceRecord.objects.filter(
                staff=staff,
                attendance_date__gte=required_start,
                attendance_date__lte=period_end,
            )
            .values("status")
            .annotate(total=Count("id"))
        )
        counts = {row["status"]: int(row["total"]) for row in status_counts}
        present_days = counts.get(AttendanceRecord.STATUS_PRESENT, 0)
        absent_days = counts.get(AttendanceRecord.STATUS_ABSENT, 0)
        late_days = counts.get(AttendanceRecord.STATUS_LATE, 0)
        leave_days = counts.get(AttendanceRecord.STATUS_LEAVE, 0)

        required_days = (period_end - required_start).days + 1
        recorded_days = present_days + absent_days + late_days + leave_days
        missing_days = max(required_days - recorded_days, 0)

    late_penalty_fraction = (
        Decimal(str(policy.late_deduction_fraction))
        if policy.late_deduction_enabled
        else Decimal("0.00")
    )
    absent_penalty_fraction = Decimal(str(policy.absent_deduction_fraction))
    absent_penalty_days = absent_days + (missing_days if policy.missing_as_absent else 0)
    paid_leave_days = min(leave_days, int(policy.monthly_paid_leave_days or 0)) if policy.leave_is_paid else 0
    unpaid_leave_days = max(leave_days - paid_leave_days, 0)
    daily_rate = Decimal(str(staff.monthly_salary)) / Decimal(str(salary_basis_days))
    base_salary = _quantize_money(Decimal(str(staff.monthly_salary)))
    deduction_amount = _quantize_money(
        daily_rate
        * (
            Decimal(str(absent_penalty_days)) * absent_penalty_fraction
            + Decimal(str(late_days)) * late_penalty_fraction
            + Decimal(str(unpaid_leave_days))
        )
    )
    payable_salary = _quantize_money(base_salary - deduction_amount)

    if payable_salary < ZERO:
        payable_salary = ZERO
    if payable_salary > base_salary:
        payable_salary = base_salary

    return {
        "present_days": present_days,
        "absent_days": absent_days,
        "late_days": late_days,
        "leave_days": leave_days,
        "missing_days": missing_days,
        "salary_basis_days": salary_basis_days,
        "covered_days": covered_days,
        "late_penalty_fraction": late_penalty_fraction,
        "absent_penalty_fraction": absent_penalty_fraction,
        "deduction_amount": _quantize_money(base_salary - payable_salary),
        "base_salary": base_salary,
        "payable_salary": payable_salary,
    }


def sync_all_salary_periods_for_attendance_policy():
    try:
        from payments.models import StaffSalaryPeriod
        from payments.services import recalculate_staff_period
    except Exception:
        return

    for period_id in StaffSalaryPeriod.objects.values_list("id", flat=True).order_by("id"):
        recalculate_staff_period(period_id)


def build_monthly_report_rows(
    *,
    month_start: date,
    staff_id: int | None = None,
    search: str | None = None,
) -> list[dict]:
    month_start = first_day_of_month(month_start)
    month_end = last_day_of_month(month_start)
    staff_qs = Staff.objects.filter(
        employment_status__in=["active", "on_leave"],
        date_hired__lte=month_end,
    ).order_by("last_name", "first_name", "id")

    if staff_id is not None:
        staff_qs = staff_qs.filter(id=staff_id)
    if search:
        search_text = search.strip()
        if search_text:
            staff_qs = staff_qs.filter(
                Q(staff_code__icontains=search_text)
                | Q(first_name__icontains=search_text)
                | Q(last_name__icontains=search_text)
            )

    rows: list[dict] = []
    for staff in staff_qs:
        metrics = calculate_payable_salary(staff, month_start)
        base_salary = _quantize_money(Decimal(str(metrics["base_salary"])))
        payable_salary = _quantize_money(Decimal(str(metrics["payable_salary"])))
        deduction_amount = _quantize_money(Decimal(str(metrics["deduction_amount"])))

        rows.append(
            {
                "staff_id": staff.id,
                "staff_code": staff.staff_code,
                "staff_name": f"{staff.first_name} {staff.last_name}".strip(),
                "position": staff.position,
                "month": month_start.strftime("%Y-%m"),
                "present_days": metrics["present_days"],
                "absent_days": metrics["absent_days"],
                "late_days": metrics["late_days"],
                "leave_days": metrics["leave_days"],
                "missing_days": metrics["missing_days"],
                "base_salary": base_salary,
                "payable_salary": payable_salary,
                "deduction_amount": deduction_amount,
                "currency": staff.salary_currency,
            }
        )
    return rows
