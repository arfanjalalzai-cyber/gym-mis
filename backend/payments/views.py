from datetime import datetime
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin
from members.models import Member
from staff.models import Staff

from .models import (
    MemberFeeCycle,
    MemberFeePayment,
    MemberFeePlan,
    StaffSalaryPayment,
    StaffSalaryPeriod,
    first_day_of_month,
)
from .serializers import (
    MemberFeeCycleSerializer,
    MemberFeeCycleUpsertSerializer,
    MemberFeePaymentCreateSerializer,
    MemberFeePaymentSerializer,
    MemberFeePlanSerializer,
    PaymentReverseSerializer,
    StaffSalaryPaymentCreateSerializer,
    StaffSalaryPaymentSerializer,
    StaffSalaryPeriodSerializer,
    StaffSalaryPeriodUpsertSerializer,
)
from .services import (
    recalculate_member_cycle,
    recalculate_staff_period,
    reverse_member_payment,
    reverse_staff_salary_payment,
    sync_member_fee_cycles_through,
    sync_staff_salary_periods_through,
    sync_staff_salary_status,
)


class MemberFeePlanViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = MemberFeePlan.objects.select_related("member").order_by("-created_at")
    serializer_class = MemberFeePlanSerializer
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["member", "billing_cycle", "currency"]
    ordering_fields = ["created_at", "effective_from", "effective_to", "cycle_fee_amount"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        member_id = self.request.query_params.get("member_id")
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        return queryset


class MemberFeeCycleViewSet(
    PermissionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = MemberFeeCycle.objects.select_related("member", "plan").order_by("-cycle_month")
    serializer_class = MemberFeeCycleSerializer
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["member", "status", "cycle_month"]
    ordering_fields = ["cycle_month", "created_at", "remaining_amount"]
    ordering = ["-cycle_month"]

    def get_queryset(self):
        queryset = super().get_queryset()
        member_id = self.request.query_params.get("member_id")
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        return queryset

    @action(detail=False, methods=["post"], permission_action="add")
    def upsert(self, request):
        serializer = MemberFeeCycleUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cycle = serializer.save()
        cycle = recalculate_member_cycle(cycle.id)
        output = MemberFeeCycleSerializer(cycle, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_action="view")
    def summary(self, request):
        member_id = request.query_params.get("member_id")
        if not member_id:
            return Response(
                {"detail": "member_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member = Member.objects.filter(pk=member_id).first()
        if not member:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)

        current_month = first_day_of_month(timezone.localdate())
        has_fee_plan = MemberFeePlan.objects.filter(member_id=member.id).exists()
        current_cycle = None
        if has_fee_plan:
            try:
                sync_member_fee_cycles_through(member=member, through_month=current_month)
                current_cycle = MemberFeeCycle.objects.filter(
                    member=member, cycle_month=current_month
                ).first()
                if current_cycle:
                    current_cycle = recalculate_member_cycle(current_cycle.id)
            except ValidationError:
                current_cycle = None

        cycles_qs = MemberFeeCycle.objects.filter(member=member, remaining_amount__gt=0).order_by(
            "cycle_month", "id"
        )
        totals = cycles_qs.aggregate(
            total_outstanding=Coalesce(Sum("remaining_amount"), Decimal("0.00"))
        )
        overdue_cycles_count = cycles_qs.filter(cycle_month__lt=current_month).count()

        payload = {
            "current_cycle": (
                MemberFeeCycleSerializer(current_cycle, context={"request": request}).data
                if current_cycle
                else None
            ),
            "current_cycle_remaining": current_cycle.remaining_amount if current_cycle else Decimal("0.00"),
            "total_outstanding": totals["total_outstanding"],
            "overdue_cycles_count": overdue_cycles_count,
            "outstanding_cycles": MemberFeeCycleSerializer(
                cycles_qs, many=True, context={"request": request}
            ).data,
            "has_fee_plan": has_fee_plan,
        }
        return Response(payload, status=status.HTTP_200_OK)


class MemberFeePaymentViewSet(
    PermissionMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = MemberFeePayment.objects.select_related("member", "cycle", "created_by").order_by(
        "-paid_at"
    )
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["member", "cycle", "payment_method", "is_reversal"]
    ordering_fields = ["paid_at", "created_at", "amount_paid"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        member_id = self.request.query_params.get("member_id")
        cycle_id = self.request.query_params.get("cycle_id")
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        payment_method = self.request.query_params.get("payment_method")

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if cycle_id:
            queryset = queryset.filter(cycle_id=cycle_id)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if date_from:
            queryset = queryset.filter(paid_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(paid_at__date__lte=date_to)
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return MemberFeePaymentCreateSerializer
        if self.action == "reverse":
            return PaymentReverseSerializer
        return MemberFeePaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        output = MemberFeePaymentSerializer(payment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_action="change")
    def reverse(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentReverseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reversal = reverse_member_payment(
            payment_id=payment.id,
            reason=serializer.validated_data.get("reason"),
            created_by=request.user,
        )
        output = MemberFeePaymentSerializer(reversal, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class StaffSalaryPeriodViewSet(
    PermissionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = StaffSalaryPeriod.objects.select_related("staff").order_by("-period_month")
    serializer_class = StaffSalaryPeriodSerializer
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff", "period_month", "status", "currency"]
    ordering_fields = ["period_month", "created_at", "remaining_amount"]
    ordering = ["-period_month"]

    def get_queryset(self):
        queryset = super().get_queryset()
        staff_id = self.request.query_params.get("staff_id")
        period_month = self.request.query_params.get("period_month")
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        if period_month:
            queryset = queryset.filter(period_month=period_month)
        return queryset

    @action(detail=False, methods=["post"], permission_action="add")
    def upsert(self, request):
        serializer = StaffSalaryPeriodUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period = serializer.save()
        period = recalculate_staff_period(period.id)
        sync_staff_salary_status(period.staff_id)
        output = StaffSalaryPeriodSerializer(period, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_action="view")
    def summary(self, request):
        staff_id = request.query_params.get("staff_id")
        if not staff_id:
            return Response(
                {"detail": "staff_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = Staff.objects.filter(pk=staff_id).first()
        if not staff:
            return Response({"detail": "Staff not found."}, status=status.HTTP_404_NOT_FOUND)

        period_month_raw = request.query_params.get("period_month")
        if period_month_raw:
            try:
                selected_month = first_day_of_month(
                    datetime.strptime(period_month_raw, "%Y-%m-%d").date()
                )
            except ValueError:
                return Response(
                    {"detail": "period_month must be in YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            selected_month = first_day_of_month(timezone.localdate())

        sync_staff_salary_periods_through(staff=staff, through_month=selected_month)
        period = StaffSalaryPeriod.objects.filter(staff=staff, period_month=selected_month).first()
        if period:
            period = recalculate_staff_period(period.id)
        sync_staff_salary_status(staff.id)

        periods_qs = StaffSalaryPeriod.objects.filter(
            staff=staff,
            period_month__lte=selected_month,
            remaining_amount__gt=0,
        ).order_by("period_month", "id")
        totals = periods_qs.aggregate(
            total_outstanding=Coalesce(Sum("remaining_amount"), Decimal("0.00"))
        )

        payload = {
            "period_month": selected_month,
            "period": (
                StaffSalaryPeriodSerializer(period, context={"request": request}).data
                if period
                else None
            ),
            "remaining_amount": period.remaining_amount if period else staff.monthly_salary,
            "status": period.status if period else "unpaid",
            "total_outstanding": totals["total_outstanding"],
            "overdue_periods_count": periods_qs.filter(period_month__lt=selected_month).count(),
            "outstanding_periods": StaffSalaryPeriodSerializer(
                periods_qs, many=True, context={"request": request}
            ).data,
        }
        return Response(payload, status=status.HTTP_200_OK)


class StaffSalaryPaymentViewSet(
    PermissionMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = StaffSalaryPayment.objects.select_related("staff", "period", "created_by").order_by(
        "-paid_at"
    )
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff", "period", "payment_method", "is_reversal"]
    ordering_fields = ["paid_at", "created_at", "amount_paid"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        staff_id = self.request.query_params.get("staff_id")
        period_id = self.request.query_params.get("period_id")
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        payment_method = self.request.query_params.get("payment_method")

        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if date_from:
            queryset = queryset.filter(paid_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(paid_at__date__lte=date_to)
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return StaffSalaryPaymentCreateSerializer
        if self.action == "reverse":
            return PaymentReverseSerializer
        return StaffSalaryPaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        output = StaffSalaryPaymentSerializer(payment, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_action="change")
    def reverse(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentReverseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reversal = reverse_staff_salary_payment(
            payment_id=payment.id,
            reason=serializer.validated_data.get("reason"),
            created_by=request.user,
        )
        output = StaffSalaryPaymentSerializer(reversal, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)
