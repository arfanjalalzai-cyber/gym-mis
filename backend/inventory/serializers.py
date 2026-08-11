from rest_framework import serializers

from .models import Equipment, EquipmentHistory


class EquipmentBaseSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)


class EquipmentListSerializer(EquipmentBaseSerializer):
    class Meta:
        model = Equipment
        fields = [
            "id",
            "equipment_code",
            "name",
            "item_type",
            "category",
            "quantity_on_hand",
            "quantity_in_service",
            "machine_status",
            "is_low_stock",
            "created_at",
        ]


class EquipmentDetailSerializer(EquipmentBaseSerializer):
    class Meta:
        model = Equipment
        fields = [
            "id",
            "equipment_code",
            "name",
            "item_type",
            "category",
            "quantity_on_hand",
            "quantity_in_service",
            "machine_status",
            "notes",
            "is_low_stock",
            "created_at",
            "updated_at",
            "deleted_at",
        ]


class EquipmentWriteSerializer(EquipmentBaseSerializer):
    class Meta:
        model = Equipment
        fields = [
            "id",
            "equipment_code",
            "name",
            "item_type",
            "category",
            "quantity_on_hand",
            "quantity_in_service",
            "machine_status",
            "notes",
            "is_low_stock",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = [
            "id",
            "equipment_code",
            "is_low_stock",
            "created_at",
            "updated_at",
            "deleted_at",
        ]

    def validate(self, attrs):
        item_type = attrs.get("item_type")
        quantity_on_hand = attrs.get("quantity_on_hand")
        quantity_in_service = attrs.get("quantity_in_service")
        machine_status = attrs.get("machine_status")

        if self.instance is not None:
            if "item_type" not in attrs:
                item_type = self.instance.item_type
            if "quantity_on_hand" not in attrs:
                quantity_on_hand = self.instance.quantity_on_hand
            if "quantity_in_service" not in attrs:
                quantity_in_service = self.instance.quantity_in_service
            if "machine_status" not in attrs:
                machine_status = self.instance.machine_status

        if quantity_on_hand is not None and quantity_on_hand <= 0:
            raise serializers.ValidationError(
                {"quantity_on_hand": "Quantity on hand must be greater than 0."}
            )

        if (
            quantity_on_hand is not None
            and quantity_in_service is not None
            and quantity_in_service > quantity_on_hand
        ):
            raise serializers.ValidationError(
                {"quantity_in_service": "Quantity in service cannot exceed quantity on hand."}
            )

        if item_type == "machine":
            if not machine_status:
                raise serializers.ValidationError(
                    {"machine_status": "Machine status is required for machine items."}
                )
        elif machine_status:
            raise serializers.ValidationError(
                {"machine_status": "Machine status is only allowed when item type is machine."}
            )

        return attrs


class EquipmentHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentHistory
        fields = [
            "id",
            "equipment",
            "event_type",
            "event_source",
            "performed_by",
            "performed_by_name",
            "before_snapshot",
            "after_snapshot",
            "quantity_on_hand_delta",
            "quantity_in_service_delta",
            "note",
            "created_at",
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        if not obj.performed_by:
            return None
        return obj.performed_by.get_full_name() or obj.performed_by.username


class QuantityAdjustmentSerializer(serializers.Serializer):
    target = serializers.ChoiceField(choices=["quantity_on_hand", "quantity_in_service"])
    operation = serializers.ChoiceField(choices=["increase", "decrease", "set"])
    value = serializers.IntegerField(min_value=0)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        equipment: Equipment | None = self.context.get("equipment")
        if equipment is None:
            raise serializers.ValidationError("Equipment context is required.")

        target = attrs["target"]
        operation = attrs["operation"]
        value = attrs["value"]

        if operation in {"increase", "decrease"} and value <= 0:
            raise serializers.ValidationError({"value": "Value must be greater than 0."})

        current_target_value = getattr(equipment, target)
        if operation == "increase":
            new_target_value = current_target_value + value
        elif operation == "decrease":
            new_target_value = current_target_value - value
        else:
            new_target_value = value

        if target == "quantity_on_hand":
            new_quantity_on_hand = new_target_value
            new_quantity_in_service = equipment.quantity_in_service
            if new_quantity_on_hand <= 0:
                raise serializers.ValidationError(
                    {"value": "Quantity on hand must be greater than 0."}
                )
        else:
            new_quantity_on_hand = equipment.quantity_on_hand
            new_quantity_in_service = new_target_value
            if new_quantity_in_service < 0:
                raise serializers.ValidationError(
                    {"value": "Quantity in service cannot be negative."}
                )

        if new_quantity_in_service > new_quantity_on_hand:
            raise serializers.ValidationError(
                {"value": "Quantity in service cannot exceed quantity on hand."}
            )

        attrs["new_quantity_on_hand"] = new_quantity_on_hand
        attrs["new_quantity_in_service"] = new_quantity_in_service
        return attrs


class MachineStatusChangeSerializer(serializers.Serializer):
    machine_status = serializers.ChoiceField(
        choices=[choice[0] for choice in Equipment.MACHINE_STATUS_CHOICES]
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
