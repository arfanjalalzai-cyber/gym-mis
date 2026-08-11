from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cards.serializers import CardDetailSerializer, CardRegenerateSerializer
from cards.services import (
    CardAlreadyExistsError,
    CardInactiveHolderError,
    CardNotFoundError,
    create_initial_card,
    get_current_card,
    list_card_history,
    regenerate_card,
)
from core.pagination import StandardResultsSetPagination
from core.permissions import PermissionMixin

from .models import Member
from .serializers import (
    MemberBodyMetricHistorySerializer,
    MemberDetailSerializer,
    MemberListSerializer,
    MemberWriteSerializer,
)


class MemberViewSet(PermissionMixin, viewsets.ModelViewSet):
    queryset = Member.objects.select_related(
        "membership_plan_template",
        "schedule_class",
        "schedule_slot",
        "schedule_slot__schedule_class",
        "schedule_slot__trainer__staff",
    ).order_by("-created_at")
    permission_classes = [IsAuthenticated]
    permission_module = "members"
    pagination_class = StandardResultsSetPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = [
        "member_code",
        "id_card_number",
        "first_name",
        "last_name",
        "phone",
        "address",
        "email",
    ]
    ordering_fields = ["created_at", "join_date", "last_name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return MemberListSerializer
        if self.action in ("create", "update", "partial_update"):
            return MemberWriteSerializer
        return MemberDetailSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        member = self.get_object()
        member.status = "active"
        member.save()
        return Response({"message": "Member activated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        member = self.get_object()
        member.status = "inactive"
        member.save()
        return Response({"message": "Member deactivated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="card", permission_action="view")
    def card(self, request, pk=None):
        member = self.get_object()
        card = get_current_card(holder_type="member", holder_id=member.id)
        if card is None:
            return Response({"detail": "Card not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="card/generate", permission_action="add")
    def generate_card(self, request, pk=None):
        member = self.get_object()
        try:
            card = create_initial_card(holder_type="member", holder_id=member.id, user=request.user)
        except CardAlreadyExistsError:
            return Response(
                {"detail": "Current card already exists. Use regenerate instead."},
                status=status.HTTP_409_CONFLICT,
            )
        except CardNotFoundError:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)
        except CardInactiveHolderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="card/regenerate", permission_action="change")
    def regenerate_member_card(self, request, pk=None):
        member = self.get_object()
        payload_serializer = CardRegenerateSerializer(data=request.data)
        payload_serializer.is_valid(raise_exception=True)
        reason = payload_serializer.validated_data.get("reason")

        try:
            card = regenerate_card(
                holder_type="member",
                holder_id=member.id,
                user=request.user,
                reason=reason,
            )
        except CardNotFoundError:
            return Response({"detail": "Current card not found."}, status=status.HTTP_404_NOT_FOUND)
        except CardInactiveHolderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CardDetailSerializer(card, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="card/history", permission_action="view")
    def card_history(self, request, pk=None):
        member = self.get_object()
        queryset = list_card_history(holder_type="member", holder_id=member.id)
        serializer = CardDetailSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="body-metrics/history", permission_action="view")
    def body_metric_history(self, request, pk=None):
        member = self.get_object()
        queryset = member.body_metric_history.order_by("-measurement_date", "-created_at")
        serializer = MemberBodyMetricHistorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
