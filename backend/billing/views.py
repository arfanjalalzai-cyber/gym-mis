from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin

from .serializers import BillDetailSerializer, BillGenerateSerializer, BillListSerializer
from .services import get_billing_history_queryset


class BillViewSet(
    PermissionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]
    permission_module = "fees"
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["member", "payment_status", "billing_date"]
    search_fields = [
        "bill_number",
        "member_full_name_snapshot",
        "member__member_code",
        "class_name_snapshot",
        "plan_label_snapshot",
    ]
    ordering_fields = ["billing_date", "created_at", "final_amount", "bill_number"]
    ordering = ["-billing_date", "-created_at"]

    def get_queryset(self):
        queryset = get_billing_history_queryset()

        member_id = self.request.query_params.get("member_id")
        date_from = self.request.query_params.get("billing_date_from")
        date_to = self.request.query_params.get("billing_date_to")
        status_param = self.request.query_params.get("status")

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if date_from:
            queryset = queryset.filter(billing_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(billing_date__lte=date_to)
        if status_param:
            queryset = queryset.filter(payment_status=status_param)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return BillListSerializer
        if self.action == "generate":
            return BillGenerateSerializer
        return BillDetailSerializer

    @action(detail=False, methods=["post"], permission_action="add")
    def generate(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        bill = serializer.save()
        output = BillDetailSerializer(bill, context={"request": request})
        status_code = (
            status.HTTP_201_CREATED
            if serializer.context.get("bill_created")
            else status.HTTP_200_OK
        )
        return Response(output.data, status=status_code)

