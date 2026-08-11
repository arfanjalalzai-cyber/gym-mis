from datetime import datetime

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin

from .models import AttendanceRecord
from .serializers import (
    AttendanceMonthlyReportRowSerializer,
    AttendancePolicySerializer,
    AttendanceRecordListSerializer,
    AttendanceRecordWriteSerializer,
    BulkUpsertAttendanceSerializer,
    serialize_daily_sheet_response,
)
from .services import (
    build_monthly_report_rows,
    get_attendance_policy,
    sync_all_salary_periods_for_attendance_policy,
    sync_salary_for_deleted_record,
    sync_salary_for_record,
)


class AttendanceRecordViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("staff", "marked_by").order_by(
        "-attendance_date", "-id"
    )
    permission_classes = [IsAuthenticated]
    permission_module = "attendance"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "staff", "attendance_date"]
    search_fields = ["staff__staff_code", "staff__first_name", "staff__last_name", "note"]
    ordering_fields = ["attendance_date", "created_at", "updated_at"]
    ordering = ["-attendance_date", "-id"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AttendanceRecordWriteSerializer
        if self.action == "bulk_upsert":
            return BulkUpsertAttendanceSerializer
        return AttendanceRecordListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        date_value = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        staff_id = self.request.query_params.get("staff_id")

        if date_value:
            queryset = queryset.filter(attendance_date=date_value)
        if date_from:
            queryset = queryset.filter(attendance_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(attendance_date__lte=date_to)
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            record = serializer.save()
            sync_salary_for_record(record)

    def perform_update(self, serializer):
        previous_staff_id = serializer.instance.staff_id
        previous_attendance_date = serializer.instance.attendance_date
        with transaction.atomic():
            record = serializer.save()
            sync_salary_for_record(
                record,
                previous=(previous_staff_id, previous_attendance_date),
            )

    def perform_destroy(self, instance):
        staff_id = instance.staff_id
        attendance_date = instance.attendance_date
        with transaction.atomic():
            instance.soft_delete()
            sync_salary_for_deleted_record(staff_id=staff_id, attendance_date=attendance_date)

    @action(detail=False, methods=["get"], permission_action="view", url_path="daily-sheet")
    def daily_sheet(self, request):
        date_param = request.query_params.get("date")
        if date_param:
            try:
                attendance_date = datetime.strptime(date_param, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "date must be in YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            from django.utils import timezone

            attendance_date = timezone.localdate()

        payload = serialize_daily_sheet_response(attendance_date)
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_action="add", url_path="bulk-upsert")
    def bulk_upsert(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            payload = serializer.save()
        return Response(payload, status=status.HTTP_200_OK)


class AttendanceMonthlyReportAPIView(PermissionMixin, APIView):
    permission_classes = [IsAuthenticated]
    permission_module = "attendance"
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        month_text = request.query_params.get("month")
        staff_id_text = request.query_params.get("staff_id")
        search = request.query_params.get("search")

        if month_text:
            try:
                month_start = datetime.strptime(month_text, "%Y-%m").date().replace(day=1)
            except ValueError:
                return Response(
                    {"detail": "month must be in YYYY-MM format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            from django.utils import timezone

            month_start = timezone.localdate().replace(day=1)

        staff_id = None
        if staff_id_text:
            try:
                staff_id = int(staff_id_text)
            except ValueError:
                return Response(
                    {"detail": "staff_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        rows = build_monthly_report_rows(
            month_start=month_start,
            staff_id=staff_id,
            search=search,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(rows, request, view=self)
        serializer = AttendanceMonthlyReportRowSerializer(page if page is not None else rows, many=True)
        if page is not None:
            return paginator.get_paginated_response(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AttendancePolicyAPIView(PermissionMixin, APIView):
    permission_classes = [IsAuthenticated]
    permission_module = "attendance"

    def get(self, request):
        policy = get_attendance_policy()
        serializer = AttendancePolicySerializer(policy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        policy = get_attendance_policy()
        serializer = AttendancePolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        sync_all_salary_periods_for_attendance_policy()
        return Response(serializer.data, status=status.HTTP_200_OK)
