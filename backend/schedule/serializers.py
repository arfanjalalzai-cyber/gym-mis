from rest_framework import serializers

from .models import ScheduleClass, ScheduleSlot


class ScheduleClassListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleClass
        fields = [
            "id",
            "class_code",
            "name",
            "description",
            "default_duration_minutes",
            "max_capacity",
            "is_active",
            "created_at",
        ]


class ScheduleClassDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleClass
        fields = [
            "id",
            "class_code",
            "name",
            "description",
            "default_duration_minutes",
            "max_capacity",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ScheduleClassWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleClass
        fields = [
            "id",
            "class_code",
            "name",
            "description",
            "default_duration_minutes",
            "max_capacity",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "class_code", "created_at", "updated_at"]

    def validate(self, attrs):
        name = attrs.get("name")
        if self.instance is not None and "name" not in attrs:
            name = self.instance.name
        if not name or not str(name).strip():
            raise serializers.ValidationError({"name": "Class name is required."})

        default_duration_minutes = attrs.get("default_duration_minutes")
        if self.instance is not None and "default_duration_minutes" not in attrs:
            default_duration_minutes = self.instance.default_duration_minutes
        if default_duration_minutes is not None and default_duration_minutes <= 0:
            raise serializers.ValidationError(
                {"default_duration_minutes": "Default duration must be greater than 0."}
            )

        max_capacity = attrs.get("max_capacity")
        if self.instance is not None and "max_capacity" not in attrs:
            max_capacity = self.instance.max_capacity
        if max_capacity is not None and max_capacity <= 0:
            raise serializers.ValidationError({"max_capacity": "Max capacity must be greater than 0."})

        attrs["name"] = str(name).strip()
        return attrs


class ScheduleSlotBaseSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="schedule_class.name", read_only=True)
    class_code = serializers.CharField(source="schedule_class.class_code", read_only=True)
    class_capacity = serializers.IntegerField(
        source="schedule_class.max_capacity", read_only=True, allow_null=True
    )
    active_member_count = serializers.SerializerMethodField()
    trainer_id = serializers.IntegerField(read_only=True)
    trainer_code = serializers.CharField(source="trainer.trainer_code", read_only=True)
    trainer_name = serializers.SerializerMethodField()

    def get_trainer_name(self, obj: ScheduleSlot):
        first_name = getattr(obj.trainer.staff, "first_name", "").strip()
        last_name = getattr(obj.trainer.staff, "last_name", "").strip()
        return f"{first_name} {last_name}".strip() or obj.trainer.trainer_code

    def get_active_member_count(self, obj: ScheduleSlot):
        annotated_count = getattr(obj, "active_member_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.scheduled_members.filter(status="active").count()


class ScheduleSlotListSerializer(ScheduleSlotBaseSerializer):
    class Meta:
        model = ScheduleSlot
        fields = [
            "id",
            "schedule_class",
            "class_name",
            "class_code",
            "class_capacity",
            "active_member_count",
            "trainer",
            "trainer_id",
            "trainer_code",
            "trainer_name",
            "weekday",
            "start_time",
            "end_time",
            "effective_from",
            "effective_to",
            "is_active",
            "created_at",
        ]


class ScheduleSlotDetailSerializer(ScheduleSlotBaseSerializer):
    class Meta:
        model = ScheduleSlot
        fields = [
            "id",
            "schedule_class",
            "class_name",
            "class_code",
            "class_capacity",
            "active_member_count",
            "trainer",
            "trainer_id",
            "trainer_code",
            "trainer_name",
            "weekday",
            "start_time",
            "end_time",
            "effective_from",
            "effective_to",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ScheduleSlotWriteSerializer(ScheduleSlotBaseSerializer):
    class Meta:
        model = ScheduleSlot
        fields = [
            "id",
            "schedule_class",
            "class_name",
            "class_code",
            "class_capacity",
            "active_member_count",
            "trainer",
            "trainer_id",
            "trainer_code",
            "trainer_name",
            "weekday",
            "start_time",
            "end_time",
            "effective_from",
            "effective_to",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "class_name",
            "class_code",
            "class_capacity",
            "active_member_count",
            "trainer_id",
            "trainer_code",
            "trainer_name",
            "created_at",
            "updated_at",
        ]

    @staticmethod
    def _time_ranges_overlap(start_a, end_a, start_b, end_b) -> bool:
        return start_a < end_b and end_a > start_b

    def _build_conflict_payload(self, slot: ScheduleSlot, reason: str):
        trainer_name = f"{slot.trainer.staff.first_name} {slot.trainer.staff.last_name}".strip()
        return {
            "slot_id": slot.id,
            "reason": reason,
            "weekday": slot.weekday,
            "start_time": slot.start_time.strftime("%H:%M:%S"),
            "end_time": slot.end_time.strftime("%H:%M:%S"),
            "class_name": slot.schedule_class.name,
            "trainer_name": trainer_name or slot.trainer.trainer_code,
        }

    def validate(self, attrs):
        schedule_class = attrs.get("schedule_class")
        trainer = attrs.get("trainer")
        weekday = attrs.get("weekday")
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        effective_from = attrs.get("effective_from")
        effective_to = attrs.get("effective_to")
        is_active = attrs.get("is_active")

        if self.instance is not None:
            if "schedule_class" not in attrs:
                schedule_class = self.instance.schedule_class
            if "trainer" not in attrs:
                trainer = self.instance.trainer
            if "weekday" not in attrs:
                weekday = self.instance.weekday
            if "start_time" not in attrs:
                start_time = self.instance.start_time
            if "end_time" not in attrs:
                end_time = self.instance.end_time
            if "effective_from" not in attrs:
                effective_from = self.instance.effective_from
            if "effective_to" not in attrs:
                effective_to = self.instance.effective_to
            if "is_active" not in attrs:
                is_active = self.instance.is_active

        if end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        if effective_from and effective_to and effective_to < effective_from:
            raise serializers.ValidationError(
                {"effective_to": "Effective end date cannot be before effective start date."}
            )

        if schedule_class and schedule_class.deleted_at is not None:
            raise serializers.ValidationError({"schedule_class": "Selected class is deleted."})

        if trainer and trainer.staff.employment_status != "active":
            raise serializers.ValidationError({"trainer": "Selected trainer is inactive."})

        if not is_active:
            return attrs

        conflict_candidates = (
            ScheduleSlot.objects.select_related("schedule_class", "trainer__staff")
            .filter(
                is_active=True,
                weekday=weekday,
                start_time__lt=end_time,
                end_time__gt=start_time,
                schedule_class__deleted_at__isnull=True,
            )
            .exclude(pk=self.instance.pk if self.instance else None)
        )

        conflicts = []
        for slot in conflict_candidates:
            if not ScheduleSlot.date_ranges_overlap(
                slot.effective_from,
                slot.effective_to,
                effective_from,
                effective_to,
            ):
                continue

            if slot.trainer_id == trainer.id:
                conflicts.append(self._build_conflict_payload(slot, "trainer_overlap"))

            if slot.schedule_class_id == schedule_class.id:
                conflicts.append(self._build_conflict_payload(slot, "class_overlap"))

        if conflicts:
            raise serializers.ValidationError(
                {
                    "detail": "Schedule conflict detected.",
                    "conflicts": conflicts,
                }
            )

        return attrs
