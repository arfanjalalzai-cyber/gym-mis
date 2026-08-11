from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from members.models import Member
from staff.models import Staff

from .models import (
    MemberFeeCycle,
    MemberFeePayment,
    MemberFeePlan,
    StaffSalaryPayment,
    StaffSalaryPeriod,
)
from .services import (
    create_member_payment,
    create_staff_salary_payment,
    get_or_create_billable_member_cycle,
    get_or_create_staff_period,
)


class MemberFeePlanSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = MemberFeePlan
        fields = [
            "id",
            "member",
            "member_code",
            "member_name",
            "plan_template",
            "billing_cycle",
            "cycle_fee_amount",
            "default_cycle_discount_amount",
            "currency",
            "effective_from",
            "effective_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "member_code", "member_name", "created_at", "updated_at"]

    def get_member_name(self, obj: MemberFeePlan):
        return f"{obj.member.first_name} {obj.member.last_name}".strip()

    @staticmethod
    def _raise_drf_validation_error(exc: DjangoValidationError):
        if hasattr(exc, "message_dict"):
            raise serializers.ValidationError(exc.message_dict)
        raise serializers.ValidationError({"detail": exc.messages})

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            self._raise_drf_validation_error(exc)

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            self._raise_drf_validation_error(exc)


class MemberFeeCycleSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.SerializerMethodField()
    plan_id = serializers.IntegerField(source="plan.id", read_only=True)

    class Meta:
        model = MemberFeeCycle
        fields = [
            "id",
            "member",
            "member_code",
            "member_name",
            "plan_id",
            "cycle_month",
            "base_due_amount",
            "cycle_discount_amount",
            "net_due_amount",
            "paid_amount",
            "payment_discount_amount",
            "remaining_amount",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj: MemberFeeCycle):
        return f"{obj.member.first_name} {obj.member.last_name}".strip()


class MemberFeeCycleUpsertSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    cycle_month = serializers.DateField()
    cycle_discount_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )

    def validate_member_id(self, value):
        if not Member.objects.filter(id=value).exists():
            raise serializers.ValidationError("Member not found.")
        return value

    def validate_cycle_discount_amount(self, value: Decimal):
        if value < 0:
            raise serializers.ValidationError("Cycle discount amount must be >= 0.")
        return value

    def save(self, **kwargs):
        member = Member.objects.get(pk=self.validated_data["member_id"])
        return get_or_create_billable_member_cycle(
            member=member,
            cycle_month=self.validated_data["cycle_month"],
            cycle_discount_override=self.validated_data.get("cycle_discount_amount"),
        )


class MemberFeePaymentSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.SerializerMethodField()
    cycle_month = serializers.DateField(source="cycle.cycle_month", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = MemberFeePayment
        fields = [
            "id",
            "member",
            "member_code",
            "member_name",
            "cycle",
            "cycle_month",
            "amount_paid",
            "discount_amount",
            "payment_method",
            "paid_at",
            "note",
            "is_reversal",
            "reversal_of",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = fields

    def get_member_name(self, obj: MemberFeePayment):
        return f"{obj.member.first_name} {obj.member.last_name}".strip()


class MemberFeePaymentCreateSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    cycle_id = serializers.IntegerField(required=False)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=Decimal("0.00")
    )
    payment_method = serializers.ChoiceField(choices=MemberFeePayment.PAYMENT_METHOD_CHOICES)
    paid_at = serializers.DateTimeField()
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_member_id(self, value):
        if not Member.objects.filter(id=value).exists():
            raise serializers.ValidationError("Member not found.")
        return value

    def validate(self, attrs):
        cycle_id = attrs.get("cycle_id")
        member_id = attrs["member_id"]
        if cycle_id:
            cycle = MemberFeeCycle.objects.filter(pk=cycle_id).first()
            if not cycle:
                raise serializers.ValidationError({"cycle_id": "Cycle not found."})
            if cycle.member_id != member_id:
                raise serializers.ValidationError(
                    {"cycle_id": "Cycle does not belong to selected member."}
                )
        return attrs

    def create(self, validated_data):
        member = Member.objects.get(pk=validated_data["member_id"])
        request = self.context.get("request")
        return create_member_payment(
            member=member,
            cycle_id=validated_data.get("cycle_id"),
            amount_paid=validated_data["amount_paid"],
            discount_amount=validated_data["discount_amount"],
            payment_method=validated_data["payment_method"],
            paid_at=validated_data["paid_at"],
            note=validated_data.get("note"),
            created_by=request.user if request else None,
        )


class PaymentReverseSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)


class StaffSalaryPeriodSerializer(serializers.ModelSerializer):
    staff_code = serializers.CharField(source="staff.staff_code", read_only=True)
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffSalaryPeriod
        fields = [
            "id",
            "staff",
            "staff_code",
            "staff_name",
            "period_month",
            "gross_salary_amount",
            "paid_amount",
            "remaining_amount",
            "status",
            "currency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj: StaffSalaryPeriod):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()


class StaffSalaryPeriodUpsertSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField()
    period_month = serializers.DateField()

    def validate_staff_id(self, value):
        if not Staff.objects.filter(id=value).exists():
            raise serializers.ValidationError("Staff not found.")
        return value

    def save(self, **kwargs):
        staff = Staff.objects.get(pk=self.validated_data["staff_id"])
        return get_or_create_staff_period(staff=staff, period_month=self.validated_data["period_month"])


class StaffSalaryPaymentSerializer(serializers.ModelSerializer):
    staff_code = serializers.CharField(source="staff.staff_code", read_only=True)
    staff_name = serializers.SerializerMethodField()
    period_month = serializers.DateField(source="period.period_month", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = StaffSalaryPayment
        fields = [
            "id",
            "staff",
            "staff_code",
            "staff_name",
            "period",
            "period_month",
            "amount_paid",
            "payment_method",
            "paid_at",
            "note",
            "is_reversal",
            "reversal_of",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = fields

    def get_staff_name(self, obj: StaffSalaryPayment):
        return f"{obj.staff.first_name} {obj.staff.last_name}".strip()


class StaffSalaryPaymentCreateSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField()
    period_id = serializers.IntegerField(required=False)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=StaffSalaryPayment.PAYMENT_METHOD_CHOICES)
    paid_at = serializers.DateTimeField()
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_staff_id(self, value):
        if not Staff.objects.filter(id=value).exists():
            raise serializers.ValidationError("Staff not found.")
        return value

    def validate(self, attrs):
        period_id = attrs.get("period_id")
        staff_id = attrs["staff_id"]
        if period_id:
            period = StaffSalaryPeriod.objects.filter(pk=period_id).first()
            if not period:
                raise serializers.ValidationError({"period_id": "Period not found."})
            if period.staff_id != staff_id:
                raise serializers.ValidationError(
                    {"period_id": "Period does not belong to selected staff."}
                )
        return attrs

    def create(self, validated_data):
        staff = Staff.objects.get(pk=validated_data["staff_id"])
        request = self.context.get("request")
        return create_staff_salary_payment(
            staff=staff,
            period_id=validated_data.get("period_id"),
            amount_paid=validated_data["amount_paid"],
            payment_method=validated_data["payment_method"],
            paid_at=validated_data["paid_at"],
            note=validated_data.get("note"),
            created_by=request.user if request else None,
        )
