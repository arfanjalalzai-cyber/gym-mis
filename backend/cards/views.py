from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CardDetailSerializer
from .services import can_user_view_holder, lookup_card_by_id


class CardLookupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        card_id = (request.query_params.get('card_id') or '').strip()
        if not card_id:
            return Response(
                {'detail': 'card_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        card = lookup_card_by_id(card_id=card_id)
        if card is None:
            return Response({'detail': 'Card not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not can_user_view_holder(request.user, card.holder_type):
            return Response(
                {'detail': "You don't have permission to view this card."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CardDetailSerializer(card, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

