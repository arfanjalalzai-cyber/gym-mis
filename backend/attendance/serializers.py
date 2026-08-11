from datetime import date
from decimal import Decimal

from rest_framework import serializers

from staff.models import Staff

from .models import AttendancePolicy, AttendanceRecord
from .services import (
    build_daily_sheet,
    bulk_upsert_daily_attendance,
    get_attendance_policy,
    validate_leave_allowed,
    validate_attendance_date,
)


class AttendanceRecordListSerializer(serializers.ModelSerializer):
    staff_code = serializers.CharField(source="staff.staff_code", read_only=True)
    staff_name = serializers.SerializerMethodField()
    marked_by_username = serializers.CharField(source="marked_by.username", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "staff",
            "staff_code",
            "staff_name",
            "attendance_date",
            "status",
            "note",
            "marked_by",
            "marked_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj: AttendanceRecord):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()


class AttendanceRecordWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "staff",
            "attendance_date",
            "status",
            "note",
            "marked_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "marked_by", "created_at", "updated_at"]

    def validate_attendance_date(self, value: date):
        validate_attendance_date(value)
        return value

    def validate(self, attrs):
        staff = attrs.get("staff", getattr(self.instance, "staff", None))
        attendance_date = attrs.get(
            "attendance_date", getattr(self.instance, "attendance_date", None)
        )

        if staff is None or attendance_date is None:
            return attrs

        duplicate_qs = AttendanceRecord.objects.filter(
            staff=staff,
            attendance_date=attendance_date,
        )
        if self.instance is not None:
            duplicate_qs = duplicate_qs.exclude(pk=self.instance.pk)
        if duplicate_qs.exists():
            raise serializers.ValidationError(
                {"attendance_date": "Only one attendance record per staff per day is allowed."}
            )

        status = attrs.get("status", getattr(self.instance, "status", None))
        if status == AttendanceRecord.STATUS_LEAVE:
            validate_leave_allowed(
                staff_id=staff.id,
                attendance_date=attendance_date,
                exclude_record_id=self.instance.id if self.instance else None,
            )

        note = attrs.get("note", None)
        if note is not None:
            attrs["note"] = note.strip() or None
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["marked_by"] = (
            request.user if request and getattr(request.user, "is_authenticated", False) else None
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        validated_data["marked_by"] = (
            request.user if request and getattr(request.user, "is_authenticated", False) else None
        )
        return super().update(instance, validated_data)


class DailySheetRowSerializer(serializers.Serializer):
    record_id = serializers.IntegerField(allow_null=True)
    staff_id = serializers.IntegerField()
    staff_code = serializers.CharField()
    staff_name = serializers.CharField()
    position = serializers.CharField()
    attendance_date = serializers.DateField()
    is_recorded = serializers.BooleanField()
    status = serializers.ChoiceField(choices=AttendanceRecord.STATUS_CHOICES)
    note = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    marked_by = serializers.IntegerField(allow_null=True)
    marked_by_username = serializers.CharField(allow_null=True)
    updated_at = serializers.DateTimeField(allow_null=True)
    monthly_paid_leave_days = serializers.IntegerField()
    leave_days_used = serializers.IntegerField()
    remaining_paid_leave_days = serializers.IntegerField()
    can_mark_leave = serializers.BooleanField()
    leave_limit_message = serializers.CharField(allow_null=True)


class DailySheetResponseSerializer(serializers.Serializer):
    attendance_date = serializers.DateField()
    results = DailySheetRowSerializer(many=True)
    count = serializers.IntegerField()


class BulkUpsertEntrySerializer(serializers.Serializer):
    staff_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=AttendanceRecord.STATUS_CHOICES)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)

    def validate_staff_id(self, value):
        if not Staff.objects.filter(id=value).exists():
            raise serializers.ValidationError("Staff not found.")
        return value


class BulkUpsertAttendanceSerializer(serializers.Serializer):
    attendance_date = serializers.DateField()
    entries = BulkUpsertEntrySerializer(many=True, required=False, default=list)

    def validate_attendance_date(self, value: date):
        validate_attendance_date(value)
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        attendance_date = validated_data["attendance_date"]
        entries = validated_data.get("entries", [])
        saved_records = bulk_upsert_daily_attendance(
            attendance_date=attendance_date,
            entries=entries,
            marked_by=request.user if request else None,
        )
        return {
            "attendance_date": attendance_date,
            "results": build_daily_sheet(attendance_date),
            "count": len(saved_records),
        }


class AttendancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendancePolicy
        fields = [
            "id",
            "block_future_dates",
            "late_deduction_enabled",
            "late_deduction_fraction",
            "absent_deduction_fraction",
            "leave_is_paid",
            "monthly_paid_leave_days",
            "missing_as_absent",
            "salary_basis",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "salary_basis", "created_at", "updated_at"]

    def validate_late_deduction_fraction(self, value: Decimal):
        if value < Decimal("0") or value > Decimal("1"):
            raise serializers.ValidationError("Late deduction fraction must be between 0 and 1.")
        return value

    def validate_absent_deduction_fraction(self, value: Decimal):
        if value < Decimal("0") or value > Decimal("1"):
            raise serializers.ValidationError("Absent deduction fraction must be between 0 and 1.")
        return value

    def validate_monthly_paid_leave_days(self, value: int):
        if value < 0 or value > 31:
            raise serializers.ValidationError("Monthly paid leave days must be between 0 and 31.")
        return value


class AttendanceMonthlyReportRowSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField()
    staff_code = serializers.CharField()
    staff_name = serializers.CharField()
    position = serializers.CharField()
    month = serializers.CharField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    leave_days = serializers.IntegerField()
    missing_days = serializers.IntegerField()
    base_salary = serializers.DecimalField(max_digits=10, decimal_places=2)
    payable_salary = serializers.DecimalField(max_digits=10, decimal_places=2)
    deduction_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()


def serialize_daily_sheet_response(attendance_date: date):
    rows = build_daily_sheet(attendance_date)
    payload = {
        "attendance_date": attendance_date,
        "results": rows,
        "count": len(rows),
    }
    return DailySheetResponseSerializer(payload).data


def get_policy_serialized():
    policy = get_attendance_policy()
    return AttendancePolicySerializer(policy).data
