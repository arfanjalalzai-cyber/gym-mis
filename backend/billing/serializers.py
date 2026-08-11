from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework import serializers

from members.models import Member
from schedule.models import ScheduleClass

from .models import Bill
from .services import generate_bill, normalize_billing_date


class BillListSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.CharField(source="member_full_name_snapshot", read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id",
            "bill_number",
            "member",
            "member_code",
            "member_name",
            "original_fee_amount",
            "discount_amount",
            "final_amount",
            "billing_date",
            "payment_status",
            "currency",
            "created_at",
        ]
        read_only_fields = fields


class BillDetailSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.CharField(source="member_full_name_snapshot", read_only=True)
    member_role_or_position = serializers.CharField(source="member_status_snapshot", read_only=True)
    membership_plan_or_class = serializers.CharField(source="plan_label_snapshot", read_only=True)
    schedule_class_name = serializers.CharField(source="class_name_snapshot", read_only=True)
    cycle_id = serializers.IntegerField(source="cycle.id", read_only=True)
    cycle_month = serializers.DateField(source="cycle.cycle_month", read_only=True)
    paid_amount = serializers.DecimalField(
        source="cycle.paid_amount", max_digits=10, decimal_places=2, read_only=True
    )
    remaining_amount = serializers.DecimalField(
        source="cycle.remaining_amount", max_digits=10, decimal_places=2, read_only=True
    )
    total_outstanding_amount = serializers.SerializerMethodField()
    total_paid_amount = serializers.SerializerMethodField()
    total_discount_amount = serializers.SerializerMethodField()

    def get_total_outstanding_amount(self, obj: Bill) -> str:
        total = obj.member.fee_cycles.filter(remaining_amount__gt=0).aggregate(
            total=Coalesce(Sum("remaining_amount"), Decimal("0.00"))
        )["total"]
        return f"{Decimal(total):.2f}"

    def get_total_paid_amount(self, obj: Bill) -> str:
        total = obj.member.fee_cycles.aggregate(
            total=Coalesce(Sum("paid_amount"), Decimal("0.00"))
        )["total"]
        return f"{Decimal(total):.2f}"

    def get_total_discount_amount(self, obj: Bill) -> str:
        totals = obj.member.fee_cycles.aggregate(
            cycle_discount=Coalesce(Sum("cycle_discount_amount"), Decimal("0.00")),
            payment_discount=Coalesce(Sum("payment_discount_amount"), Decimal("0.00")),
        )
        total = Decimal(totals["cycle_discount"]) + Decimal(totals["payment_discount"])
        return f"{total:.2f}"

    class Meta:
        model = Bill
        fields = [
            "id",
            "bill_number",
            "member",
            "member_code",
            "member_name",
            "member_role_or_position",
            "membership_plan_or_class",
            "schedule_class",
            "schedule_class_name",
            "cycle_id",
            "cycle_month",
            "original_fee_amount",
            "discount_amount",
            "final_amount",
            "paid_amount",
            "remaining_amount",
            "total_outstanding_amount",
            "total_paid_amount",
            "total_discount_amount",
            "billing_date",
            "payment_status",
            "currency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BillGenerateSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    billing_date = serializers.DateField(required=False)
    discount_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=Decimal("0.00")
    )
    schedule_class_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_member_id(self, value):
        member = Member.objects.filter(pk=value).first()
        if member is None:
            raise serializers.ValidationError("Member not found.")
        if member.status != "active":
            raise serializers.ValidationError("Inactive members cannot generate bills.")
        return value

    def validate_schedule_class_id(self, value):
        if value is None:
            return value
        schedule_class = ScheduleClass.objects.filter(pk=value).first()
        if not schedule_class or schedule_class.deleted_at is not None:
            raise serializers.ValidationError("Schedule class not found.")
        if not schedule_class.is_active:
            raise serializers.ValidationError("Selected schedule class is inactive.")
        return value

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount amount must be greater than or equal to 0.")
        return value

    def create(self, validated_data):
        member = Member.objects.get(pk=validated_data["member_id"])
        schedule_class = None
        if validated_data.get("schedule_class_id"):
            schedule_class = ScheduleClass.objects.get(pk=validated_data["schedule_class_id"])

        bill, created = generate_bill(
            member=member,
            billing_date=normalize_billing_date(validated_data.get("billing_date")),
            discount_amount=validated_data.get("discount_amount"),
            schedule_class=schedule_class,
        )
        self.context["bill_created"] = created
        return bill
