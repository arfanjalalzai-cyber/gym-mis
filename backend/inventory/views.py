from django.db.models import F, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin

from .models import Equipment, EquipmentHistory
from .serializers import (
    EquipmentDetailSerializer,
    EquipmentHistorySerializer,
    EquipmentListSerializer,
    EquipmentWriteSerializer,
    MachineStatusChangeSerializer,
    QuantityAdjustmentSerializer,
)


def _parse_bool(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


class EquipmentViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = Equipment.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]
    permission_module = "inventory"
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["item_type", "category", "machine_status"]
    search_fields = ["equipment_code", "name"]
    ordering_fields = [
        "created_at",
        "name",
        "quantity_on_hand",
        "quantity_in_service",
    ]
    ordering = ["-created_at"]

    SNAPSHOT_FIELDS = [
        "id",
        "equipment_code",
        "name",
        "item_type",
        "category",
        "quantity_on_hand",
        "quantity_in_service",
        "machine_status",
        "notes",
        "deleted_at",
    ]

    def get_queryset(self):
        include_deleted = _parse_bool(self.request.query_params.get("include_deleted"))
        queryset = Equipment.all_objects.all() if include_deleted else Equipment.objects.all()

        low_stock = _parse_bool(self.request.query_params.get("low_stock"))
        low_stock_query = Q(quantity_on_hand__lte=F("quantity_in_service"))
        if low_stock is True:
            queryset = queryset.filter(low_stock_query)
        elif low_stock is False:
            queryset = queryset.exclude(low_stock_query)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "list":
            return EquipmentListSerializer
        if self.action in ("create", "update", "partial_update"):
            return EquipmentWriteSerializer
        return EquipmentDetailSerializer

    def _serialize_snapshot(self, equipment: Equipment):
        snapshot = {}
        for field_name in self.SNAPSHOT_FIELDS:
            value = getattr(equipment, field_name)
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            snapshot[field_name] = value
        snapshot["is_low_stock"] = equipment.is_low_stock
        return snapshot

    def _create_history(
        self,
        equipment: Equipment,
        event_type: str,
        event_source: str,
        before_snapshot: dict | None = None,
        after_snapshot: dict | None = None,
        note: str | None = None,
    ):
        quantity_on_hand_delta = None
        quantity_in_service_delta = None

        if before_snapshot and after_snapshot:
            before_qoh = before_snapshot.get("quantity_on_hand")
            after_qoh = after_snapshot.get("quantity_on_hand")
            if before_qoh is not None and after_qoh is not None:
                quantity_on_hand_delta = after_qoh - before_qoh

            before_qis = before_snapshot.get("quantity_in_service")
            after_qis = after_snapshot.get("quantity_in_service")
            if before_qis is not None and after_qis is not None:
                quantity_in_service_delta = after_qis - before_qis

        EquipmentHistory.objects.create(
            equipment=equipment,
            event_type=event_type,
            event_source=event_source,
            performed_by=self.request.user if self.request.user.is_authenticated else None,
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            quantity_on_hand_delta=quantity_on_hand_delta,
            quantity_in_service_delta=quantity_in_service_delta,
            note=note or None,
        )

    def perform_create(self, serializer):
        equipment = serializer.save()
        self._create_history(
            equipment=equipment,
            event_type="created",
            event_source="system",
            before_snapshot=None,
            after_snapshot=self._serialize_snapshot(equipment),
        )

    def perform_update(self, serializer):
        equipment = self.get_object()
        before_snapshot = self._serialize_snapshot(equipment)
        equipment = serializer.save()
        after_snapshot = self._serialize_snapshot(equipment)

        quantity_changed = (
            before_snapshot["quantity_on_hand"] != after_snapshot["quantity_on_hand"]
            or before_snapshot["quantity_in_service"] != after_snapshot["quantity_in_service"]
        )
        machine_status_changed = before_snapshot["machine_status"] != after_snapshot["machine_status"]

        if quantity_changed:
            event_type = "quantity_adjusted"
        elif machine_status_changed:
            event_type = "status_changed"
        else:
            event_type = "updated"

        self._create_history(
            equipment=equipment,
            event_type=event_type,
            event_source="form_edit",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
        )

    def perform_destroy(self, instance):
        before_snapshot = self._serialize_snapshot(instance)
        super().perform_destroy(instance)

        deleted_instance = Equipment.all_objects.get(pk=instance.pk)
        after_snapshot = self._serialize_snapshot(deleted_instance)
        self._create_history(
            equipment=deleted_instance,
            event_type="deleted",
            event_source="system",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
        )

    @action(detail=True, methods=["post"], permission_action="change", url_path="adjust-quantity")
    def adjust_quantity(self, request, pk=None):
        equipment = self.get_object()
        serializer = QuantityAdjustmentSerializer(data=request.data, context={"equipment": equipment})
        serializer.is_valid(raise_exception=True)

        before_snapshot = self._serialize_snapshot(equipment)
        equipment.quantity_on_hand = serializer.validated_data["new_quantity_on_hand"]
        equipment.quantity_in_service = serializer.validated_data["new_quantity_in_service"]
        equipment.save(update_fields=["quantity_on_hand", "quantity_in_service", "updated_at"])

        after_snapshot = self._serialize_snapshot(equipment)
        self._create_history(
            equipment=equipment,
            event_type="quantity_adjusted",
            event_source="adjustment_action",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            note=serializer.validated_data.get("note"),
        )

        output_serializer = EquipmentDetailSerializer(equipment, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_action="change", url_path="change-status")
    def change_status(self, request, pk=None):
        equipment = self.get_object()
        if equipment.item_type != "machine":
            return Response(
                {"detail": "Machine status can only be changed for machine items."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MachineStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        before_snapshot = self._serialize_snapshot(equipment)
        equipment.machine_status = serializer.validated_data["machine_status"]
        equipment.save(update_fields=["machine_status", "updated_at"])

        after_snapshot = self._serialize_snapshot(equipment)
        self._create_history(
            equipment=equipment,
            event_type="status_changed",
            event_source="status_action",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
            note=serializer.validated_data.get("note"),
        )

        output_serializer = EquipmentDetailSerializer(equipment, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        equipment = self.get_object()
        queryset = equipment.history_entries.select_related("performed_by").all()
        event_type = request.query_params.get("event_type")
        valid_event_types = {choice[0] for choice in EquipmentHistory.EVENT_TYPE_CHOICES}
        if event_type in valid_event_types:
            queryset = queryset.filter(event_type=event_type)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = EquipmentHistorySerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = EquipmentHistorySerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        queryset = self.filter_queryset(
            self.get_queryset().filter(quantity_on_hand__lte=F("quantity_in_service"))
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = EquipmentListSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = EquipmentListSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_action="change")
    def restore(self, request, pk=None):
        equipment = Equipment.all_objects.filter(pk=pk).first()
        if not equipment:
            return Response({"detail": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)

        if equipment.deleted_at is None:
            return Response(
                {"detail": "Equipment is already active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        before_snapshot = self._serialize_snapshot(equipment)
        equipment.restore()
        after_snapshot = self._serialize_snapshot(equipment)

        self._create_history(
            equipment=equipment,
            event_type="restored",
            event_source="system",
            before_snapshot=before_snapshot,
            after_snapshot=after_snapshot,
        )

        serializer = EquipmentDetailSerializer(equipment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
