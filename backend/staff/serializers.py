from datetime import date
import json
import re

from rest_framework import serializers

from schedule.models import ScheduleClass
from .models import Staff, Trainer

AFGHAN_MOBILE_PATTERN = re.compile(r"^07\d{8}$")


def validate_afghan_mobile_number(value: str, field_label: str) -> str:
    normalized = (value or "").strip()
    if not AFGHAN_MOBILE_PATTERN.fullmatch(normalized):
        raise serializers.ValidationError(
            f"{field_label} must be exactly 10 digits and start with 07."
        )
    return normalized


class StaffBaseSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    trainer_id = serializers.IntegerField(source="trainer_profile.id", read_only=True)
    trainer_code = serializers.CharField(source="trainer_profile.trainer_code", read_only=True)
    assigned_classes = serializers.SerializerMethodField()

    def get_age(self, obj: Staff):
        if not obj.date_of_birth:
            return None

        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )

    def get_profile_picture_url(self, obj: Staff):
        if not obj.profile_picture:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url

    def get_assigned_classes(self, obj: Staff):
        trainer = getattr(obj, "trainer_profile", None)
        if trainer is None:
            return []
        return [
            {
                "id": schedule_class.id,
                "class_code": schedule_class.class_code,
                "name": schedule_class.name,
            }
            for schedule_class in trainer.assigned_classes.all()
        ]


class StaffListSerializer(StaffBaseSerializer):
    class Meta:
        model = Staff
        fields = [
            "id",
            "staff_code",
            "position",
            "position_other",
            "first_name",
            "last_name",
            "mobile_number",
            "address",
            "email",
            "date_hired",
            "monthly_salary",
            "salary_currency",
            "salary_status",
            "employment_status",
            "profile_picture",
            "profile_picture_url",
            "trainer_id",
            "trainer_code",
            "assigned_classes",
            "age",
            "created_at",
        ]


class StaffDetailSerializer(StaffBaseSerializer):
    class Meta:
        model = Staff
        fields = [
            "id",
            "staff_code",
            "position",
            "position_other",
            "id_card_number",
            "first_name",
            "last_name",
            "father_name",
            "mobile_number",
            "whatsapp_number",
            "address",
            "email",
            "blood_group",
            "profile_picture",
            "profile_picture_url",
            "date_of_birth",
            "age",
            "date_hired",
            "monthly_salary",
            "salary_currency",
            "salary_status",
            "employment_status",
            "notes",
            "trainer_id",
            "trainer_code",
            "assigned_classes",
            "created_at",
            "updated_at",
        ]


class StaffWriteSerializer(StaffBaseSerializer):
    assigned_class_ids = serializers.JSONField(
        required=False,
        write_only=True,
    )

    class Meta:
        model = Staff
        fields = [
            "id",
            "staff_code",
            "position",
            "position_other",
            "id_card_number",
            "first_name",
            "last_name",
            "father_name",
            "mobile_number",
            "whatsapp_number",
            "address",
            "email",
            "blood_group",
            "profile_picture",
            "profile_picture_url",
            "date_of_birth",
            "age",
            "date_hired",
            "monthly_salary",
            "salary_currency",
            "salary_status",
            "employment_status",
            "notes",
            "trainer_id",
            "trainer_code",
            "assigned_classes",
            "assigned_class_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "staff_code",
            "age",
            "profile_picture_url",
            "trainer_id",
            "trainer_code",
            "assigned_classes",
            "created_at",
            "updated_at",
        ]

    def _sync_trainer_profile(self, staff: Staff, assigned_classes=None):
        if staff.position == "trainer":
            trainer, _ = Trainer.objects.get_or_create(staff=staff)
            if assigned_classes is not None:
                trainer.assigned_classes.set(assigned_classes)
            return
        Trainer.objects.filter(staff=staff).delete()

    def validate(self, attrs):
        today = date.today()

        monthly_salary = attrs.get("monthly_salary")
        if self.instance is not None and "monthly_salary" not in attrs:
            monthly_salary = self.instance.monthly_salary
        if monthly_salary is not None and monthly_salary <= 0:
            raise serializers.ValidationError({"monthly_salary": "Monthly salary must be greater than 0."})

        date_of_birth = attrs.get("date_of_birth")
        if self.instance is not None and "date_of_birth" not in attrs:
            date_of_birth = self.instance.date_of_birth
        if date_of_birth and date_of_birth > today:
            raise serializers.ValidationError({"date_of_birth": "Date of birth cannot be in the future."})

        date_hired = attrs.get("date_hired")
        if self.instance is not None and "date_hired" not in attrs:
            date_hired = self.instance.date_hired
        if date_hired and date_hired > today:
            raise serializers.ValidationError({"date_hired": "Date hired cannot be in the future."})

        position = attrs.get("position")
        if self.instance is not None and "position" not in attrs:
            position = self.instance.position

        position_other = attrs.get("position_other")
        if self.instance is not None and "position_other" not in attrs:
            position_other = self.instance.position_other

        if position == "other":
            if not position_other or not str(position_other).strip():
                raise serializers.ValidationError(
                    {"position_other": "Position details are required when position is 'other'."}
                )
            attrs["position_other"] = str(position_other).strip()
        elif "position_other" in attrs or position_other:
            attrs["position_other"] = None

        assigned_class_ids = attrs.get("assigned_class_ids")
        if assigned_class_ids is not None:
            if isinstance(assigned_class_ids, str):
                try:
                    assigned_class_ids = json.loads(assigned_class_ids)
                except json.JSONDecodeError as exc:
                    raise serializers.ValidationError(
                        {"assigned_class_ids": "Assigned classes must be a JSON array."}
                    ) from exc
            if not isinstance(assigned_class_ids, list):
                raise serializers.ValidationError(
                    {"assigned_class_ids": "Assigned classes must be a JSON array."}
                )
            normalized_ids = []
            for class_id in assigned_class_ids:
                try:
                    parsed_id = int(class_id)
                except (TypeError, ValueError) as exc:
                    raise serializers.ValidationError(
                        {"assigned_class_ids": "Each assigned class must be a valid id."}
                    ) from exc
                if parsed_id <= 0:
                    raise serializers.ValidationError(
                        {"assigned_class_ids": "Each assigned class must be a valid id."}
                    )
                if parsed_id not in normalized_ids:
                    normalized_ids.append(parsed_id)
            classes = list(
                ScheduleClass.objects.filter(id__in=normalized_ids, is_active=True)
            )
            found_ids = {schedule_class.id for schedule_class in classes}
            missing_ids = [class_id for class_id in normalized_ids if class_id not in found_ids]
            if missing_ids:
                raise serializers.ValidationError(
                    {"assigned_class_ids": "One or more selected classes are invalid."}
                )
            attrs["assigned_class_ids"] = classes

        return attrs

    def validate_mobile_number(self, value):
        return validate_afghan_mobile_number(value, "Mobile number")

    def validate_whatsapp_number(self, value):
        if value in (None, ""):
            return value
        return validate_afghan_mobile_number(value, "WhatsApp number")

    def create(self, validated_data):
        assigned_classes = validated_data.pop("assigned_class_ids", None)
        staff = super().create(validated_data)
        self._sync_trainer_profile(staff, assigned_classes)
        return staff

    def update(self, instance, validated_data):
        assigned_classes = validated_data.pop("assigned_class_ids", None)
        staff = super().update(instance, validated_data)
        self._sync_trainer_profile(staff, assigned_classes)
        return staff
