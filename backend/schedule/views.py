from datetime import date, datetime, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin
from staff.models import Trainer as StaffTrainer

from .models import ScheduleClass, ScheduleSlot
from .serializers import (
    ScheduleClassDetailSerializer,
    ScheduleClassListSerializer,
    ScheduleClassWriteSerializer,
    ScheduleSlotDetailSerializer,
    ScheduleSlotListSerializer,
    ScheduleSlotWriteSerializer,
)


WEEKDAY_LABELS = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}


class ScheduleClassViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = ScheduleClass.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]
    permission_module = "schedule"
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["class_code", "name", "description"]
    ordering_fields = ["created_at", "name", "default_duration_minutes"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduleClassListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ScheduleClassWriteSerializer
        return ScheduleClassDetailSerializer

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        now = timezone.now()
        ScheduleSlot.objects.filter(schedule_class=instance).update(
            deleted_at=now, updated_at=now
        )


class ScheduleSlotViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = ScheduleSlot.objects.select_related("schedule_class", "trainer__staff").order_by(
        "weekday", "start_time", "created_at"
    )
    permission_classes = [IsAuthenticated]
    permission_module = "schedule"
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["weekday", "trainer", "schedule_class", "is_active"]
    search_fields = [
        "schedule_class__class_code",
        "schedule_class__name",
        "trainer__trainer_code",
        "trainer__staff__first_name",
        "trainer__staff__last_name",
    ]
    ordering_fields = ["created_at", "weekday", "start_time", "end_time"]
    ordering = ["weekday", "start_time", "-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            schedule_class__deleted_at__isnull=True,
            trainer__staff__deleted_at__isnull=True,
        )

        if self.action in {"list", "weekly"}:
            queryset = queryset.filter(is_active=True)

        queryset = queryset.annotate(
            active_member_count=Count(
                "scheduled_members",
                filter=Q(
                    scheduled_members__status="active",
                    scheduled_members__deleted_at__isnull=True,
                ),
                distinct=True,
            )
        )

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduleSlotListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ScheduleSlotWriteSerializer
        return ScheduleSlotDetailSerializer

    @staticmethod
    def _week_start_from_query(raw_value: str | None) -> date:
        if raw_value:
            return datetime.strptime(raw_value, "%Y-%m-%d").date()
        today = date.today()
        return today - timedelta(days=today.weekday())

    @action(detail=False, methods=["get"])
    def weekly(self, request):
        try:
            week_start = self._week_start_from_query(request.query_params.get("week_start"))
        except ValueError:
            return Response(
                {"detail": "week_start must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        week_end = week_start + timedelta(days=6)

        queryset = self.get_queryset()
        trainer_id = request.query_params.get("trainer_id")
        class_id = request.query_params.get("class_id")

        if trainer_id:
            try:
                queryset = queryset.filter(trainer_id=int(trainer_id))
            except ValueError:
                return Response(
                    {"detail": "trainer_id must be a valid integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if class_id:
            try:
                queryset = queryset.filter(schedule_class_id=int(class_id))
            except ValueError:
                return Response(
                    {"detail": "class_id must be a valid integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        queryset = queryset.order_by("weekday", "start_time")

        serialized_slots = ScheduleSlotListSerializer(
            queryset, many=True, context={"request": request}
        ).data
        slots_by_weekday = {weekday: [] for weekday in range(7)}
        for slot in serialized_slots:
            slots_by_weekday[slot["weekday"]].append(slot)

        days = []
        for weekday in range(7):
            slot_date = week_start + timedelta(days=weekday)
            days.append(
                {
                    "weekday": weekday,
                    "label": WEEKDAY_LABELS[weekday],
                    "date": slot_date.isoformat(),
                    "slots": slots_by_weekday[weekday],
                }
            )

        return Response(
            {
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "days": days,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def trainers(self, request):
        trainers = (
            StaffTrainer.objects.select_related("staff")
            .filter(
                staff__position="trainer",
                staff__employment_status="active",
                staff__deleted_at__isnull=True,
            )
            .order_by("staff__first_name", "staff__last_name")
        )

        options = [
            {
                "id": trainer.id,
                "trainer_code": trainer.trainer_code,
                "staff_id": trainer.staff_id,
                "trainer_name": f"{trainer.staff.first_name} {trainer.staff.last_name}".strip()
                or trainer.trainer_code,
            }
            for trainer in trainers
        ]
        return Response(options, status=status.HTTP_200_OK)
