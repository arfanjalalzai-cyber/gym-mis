from decimal import Decimal, ROUND_HALF_UP
import re

from rest_framework import serializers

from payments.models import MemberFeePlan
from schedule.models import ScheduleClass, ScheduleSlot
from system_settings.models import MembershipPlanTemplate

from .models import Member, MemberBodyMetricHistory

AFGHAN_MOBILE_PATTERN = re.compile(r"^07\d{8}$")


def validate_afghan_mobile_number(value: str, field_label: str) -> str:
    normalized = (value or "").strip()
    if not AFGHAN_MOBILE_PATTERN.fullmatch(normalized):
        raise serializers.ValidationError(
            f"{field_label} must be exactly 10 digits and start with 07."
        )
    return normalized


def compute_bmi_value(height_cm, weight_kg):
    if height_cm is None or weight_kg is None:
        return None

    if height_cm <= 0 or weight_kg <= 0:
        return None

    height_m = Decimal(height_cm) / Decimal("100")
    bmi_value = Decimal(weight_kg) / (height_m * height_m)
    return bmi_value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def get_bmi_category(bmi_value):
    if bmi_value is None:
        return None
    if bmi_value < Decimal("18.5"):
        return "underweight"
    if bmi_value < Decimal("25"):
        return "normal"
    if bmi_value < Decimal("30"):
        return "overweight"
    return "obese"


class MemberBMIModelSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    membership_plan_name = serializers.CharField(source="membership_plan_template.name", read_only=True)
    membership_plan_duration_type = serializers.CharField(
        source="membership_plan_template.duration_type", read_only=True
    )
    membership_plan_duration_months = serializers.IntegerField(
        source="membership_plan_template.duration_months", read_only=True
    )
    membership_plan_fee = serializers.DecimalField(
        source="membership_plan_template.fee",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    schedule_class_name = serializers.CharField(source="schedule_class.name", read_only=True)
    schedule_class_code = serializers.CharField(source="schedule_class.class_code", read_only=True)
    schedule_slot_class_name = serializers.CharField(source="schedule_slot.schedule_class.name", read_only=True)
    schedule_slot_class_code = serializers.CharField(source="schedule_slot.schedule_class.class_code", read_only=True)
    schedule_slot_weekday = serializers.IntegerField(source="schedule_slot.weekday", read_only=True)
    schedule_slot_start_time = serializers.TimeField(source="schedule_slot.start_time", read_only=True)
    schedule_slot_end_time = serializers.TimeField(source="schedule_slot.end_time", read_only=True)
    schedule_slot_trainer_name = serializers.SerializerMethodField()

    def _compute_bmi(self, obj: Member):
        return compute_bmi_value(obj.height_cm, obj.weight_kg)

    def get_bmi(self, obj: Member):
        bmi_value = self._compute_bmi(obj)
        return float(bmi_value) if bmi_value is not None else None

    def get_bmi_category(self, obj: Member):
        bmi_value = self._compute_bmi(obj)
        return get_bmi_category(bmi_value)

    def get_profile_picture_url(self, obj: Member):
        if not obj.profile_picture:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url

    def get_schedule_slot_trainer_name(self, obj: Member):
        if not obj.schedule_slot_id:
            return None
        staff = obj.schedule_slot.trainer.staff
        trainer_name = f"{staff.first_name} {staff.last_name}".strip()
        return trainer_name or obj.schedule_slot.trainer.trainer_code


class MemberListSerializer(MemberBMIModelSerializer):
    class Meta:
        model = Member
        fields = [
            "id",
            "member_code",
            "id_card_number",
            "first_name",
            "last_name",
            "phone",
            "address",
            "email",
            "blood_group",
            "profile_picture",
            "profile_picture_url",
            "join_date",
            "membership_plan_template",
            "membership_plan_name",
            "membership_plan_duration_type",
            "membership_plan_duration_months",
            "membership_plan_fee",
            "schedule_class",
            "schedule_class_name",
            "schedule_class_code",
            "schedule_slot",
            "schedule_slot_class_name",
            "schedule_slot_class_code",
            "schedule_slot_weekday",
            "schedule_slot_start_time",
            "schedule_slot_end_time",
            "schedule_slot_trainer_name",
            "status",
            "height_cm",
            "weight_kg",
            "bmi",
            "bmi_category",
            "created_at",
        ]


class MemberDetailSerializer(MemberBMIModelSerializer):
    class Meta:
        model = Member
        fields = [
            "id",
            "member_code",
            "id_card_number",
            "first_name",
            "last_name",
            "phone",
            "address",
            "email",
            "blood_group",
            "profile_picture",
            "profile_picture_url",
            "date_of_birth",
            "gender",
            "emergency_contact_name",
            "emergency_contact_phone",
            "height_cm",
            "weight_kg",
            "bmi",
            "bmi_category",
            "join_date",
            "membership_plan_template",
            "membership_plan_name",
            "membership_plan_duration_type",
            "membership_plan_duration_months",
            "membership_plan_fee",
            "schedule_class",
            "schedule_class_name",
            "schedule_class_code",
            "schedule_slot",
            "schedule_slot_class_name",
            "schedule_slot_class_code",
            "schedule_slot_weekday",
            "schedule_slot_start_time",
            "schedule_slot_end_time",
            "schedule_slot_trainer_name",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]


class MemberWriteSerializer(MemberBMIModelSerializer):
    membership_plan_template = serializers.PrimaryKeyRelatedField(
        queryset=MembershipPlanTemplate.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    schedule_class = serializers.PrimaryKeyRelatedField(
        queryset=ScheduleClass.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    schedule_slot = serializers.PrimaryKeyRelatedField(
        queryset=ScheduleSlot.objects.select_related("schedule_class", "trainer__staff").filter(
            is_active=True,
            schedule_class__is_active=True,
            schedule_class__deleted_at__isnull=True,
            trainer__staff__employment_status="active",
            trainer__staff__deleted_at__isnull=True,
        ),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Member
        fields = [
            "id",
            "member_code",
            "id_card_number",
            "first_name",
            "last_name",
            "phone",
            "address",
            "email",
            "blood_group",
            "profile_picture",
            "profile_picture_url",
            "date_of_birth",
            "gender",
            "emergency_contact_name",
            "emergency_contact_phone",
            "height_cm",
            "weight_kg",
            "bmi",
            "bmi_category",
            "join_date",
            "membership_plan_template",
            "membership_plan_name",
            "membership_plan_duration_type",
            "membership_plan_duration_months",
            "membership_plan_fee",
            "schedule_class",
            "schedule_class_name",
            "schedule_class_code",
            "schedule_slot",
            "schedule_slot_class_name",
            "schedule_slot_class_code",
            "schedule_slot_weekday",
            "schedule_slot_start_time",
            "schedule_slot_end_time",
            "schedule_slot_trainer_name",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "member_code",
            "bmi",
            "bmi_category",
            "profile_picture_url",
            "schedule_class_name",
            "schedule_class_code",
            "schedule_slot_class_name",
            "schedule_slot_class_code",
            "schedule_slot_weekday",
            "schedule_slot_start_time",
            "schedule_slot_end_time",
            "schedule_slot_trainer_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        height_cm = attrs.get("height_cm")
        weight_kg = attrs.get("weight_kg")
        schedule_slot = attrs.get("schedule_slot")

        if self.instance is not None:
            if "height_cm" not in attrs:
                height_cm = self.instance.height_cm
            if "weight_kg" not in attrs:
                weight_kg = self.instance.weight_kg

        if height_cm is not None and height_cm <= 0:
            raise serializers.ValidationError({"height_cm": "Height must be greater than 0."})

        if weight_kg is not None and weight_kg <= 0:
            raise serializers.ValidationError({"weight_kg": "Weight must be greater than 0."})

        has_height = height_cm is not None
        has_weight = weight_kg is not None
        if has_height != has_weight:
            raise serializers.ValidationError(
                "Height and weight must both be provided to compute BMI."
            )

        if schedule_slot is not None:
            attrs["schedule_class"] = schedule_slot.schedule_class

        return attrs

    def validate_phone(self, value):
        return validate_afghan_mobile_number(value, "Phone")

    def validate_emergency_contact_phone(self, value):
        if value in (None, ""):
            return value
        return validate_afghan_mobile_number(value, "Emergency contact phone")

    def _sync_fee_plan_from_template(self, member: Member):
        template = member.membership_plan_template
        if template is None:
            return

        MemberFeePlan.objects.update_or_create(
            member=member,
            defaults={
                "plan_template": template,
                "billing_cycle": template.duration_type,
                "cycle_fee_amount": template.fee,
                "currency": "AFN",
                "effective_from": member.join_date,
            },
        )

    def _record_body_metric_history(self, member: Member):
        bmi_value = compute_bmi_value(member.height_cm, member.weight_kg)
        bmi_category = get_bmi_category(bmi_value)
        if bmi_value is None or bmi_category is None:
            return

        latest = member.body_metric_history.order_by("-measurement_date", "-created_at").first()
        if (
            latest
            and latest.height_cm == member.height_cm
            and latest.weight_kg == member.weight_kg
            and latest.bmi == bmi_value
            and latest.bmi_category == bmi_category
        ):
            return

        MemberBodyMetricHistory.objects.create(
            member=member,
            height_cm=member.height_cm,
            weight_kg=member.weight_kg,
            bmi=bmi_value,
            bmi_category=bmi_category,
        )

    def create(self, validated_data):
        member = super().create(validated_data)
        self._sync_fee_plan_from_template(member)
        self._record_body_metric_history(member)
        return member

    def update(self, instance, validated_data):
        metrics_touched = "height_cm" in validated_data or "weight_kg" in validated_data
        member = super().update(instance, validated_data)
        if "membership_plan_template" in validated_data or "join_date" in validated_data:
            self._sync_fee_plan_from_template(member)
        if metrics_touched:
            self._record_body_metric_history(member)
        return member


class MemberBodyMetricHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberBodyMetricHistory
        fields = [
            "id",
            "member",
            "measurement_date",
            "height_cm",
            "weight_kg",
            "bmi",
            "bmi_category",
            "created_at",
        ]
        read_only_fields = fields
