from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cards.serializers import CardDetailSerializer, CardRegenerateSerializer
from cards.services import (
    CardAlreadyExistsError,
    CardNotFoundError,
    create_initial_card,
    get_current_card,
    list_card_history,
    regenerate_card,
)
from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin

from .models import Staff
from .serializers import StaffDetailSerializer, StaffListSerializer, StaffWriteSerializer


class StaffViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = (
        Staff.objects.select_related("trainer_profile")
        .prefetch_related("trainer_profile__assigned_classes")
        .order_by("-created_at")
    )
    permission_classes = [IsAuthenticated]
    permission_module = "staff"
    pagination_class = StandardResultsSetPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["position", "employment_status", "salary_status"]
    search_fields = [
        "staff_code",
        "id_card_number",
        "first_name",
        "last_name",
        "mobile_number",
        "address",
        "email",
    ]
    ordering_fields = ["created_at", "date_hired", "last_name", "monthly_salary"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return StaffListSerializer
        if self.action in ("create", "update", "partial_update"):
            return StaffWriteSerializer
        return StaffDetailSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        staff = self.get_object()
        staff.employment_status = "active"
        staff.save(update_fields=["employment_status", "updated_at"])
        return Response({"message": "Staff activated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        staff = self.get_object()
        staff.employment_status = "inactive"
        staff.save(update_fields=["employment_status", "updated_at"])
        return Response({"message": "Staff deactivated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="card", permission_action="view")
    def card(self, request, pk=None):
        staff = self.get_object()
        card = get_current_card(holder_type="staff", holder_id=staff.id)
        if card is None:
            return Response({"detail": "Card not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="card/generate", permission_action="add")
    def generate_card(self, request, pk=None):
        staff = self.get_object()
        try:
            card = create_initial_card(holder_type="staff", holder_id=staff.id, user=request.user)
        except CardAlreadyExistsError:
            return Response(
                {"detail": "Current card already exists. Use regenerate instead."},
                status=status.HTTP_409_CONFLICT,
            )
        except CardNotFoundError:
            return Response({"detail": "Staff not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="card/regenerate", permission_action="change")
    def regenerate_staff_card(self, request, pk=None):
        staff = self.get_object()
        payload_serializer = CardRegenerateSerializer(data=request.data)
        payload_serializer.is_valid(raise_exception=True)
        reason = payload_serializer.validated_data.get("reason")

        try:
            card = regenerate_card(
                holder_type="staff",
                holder_id=staff.id,
                user=request.user,
                reason=reason,
            )
        except CardNotFoundError:
            return Response({"detail": "Current card not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="card/history", permission_action="view")
    def card_history(self, request, pk=None):
        staff = self.get_object()
        queryset = list_card_history(holder_type="staff", holder_id=staff.id)
        serializer = CardDetailSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
