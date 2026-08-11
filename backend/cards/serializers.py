from rest_framework import serializers

from .models import Card
from .services import build_member_validity, compute_member_card_status


class CardRegenerateSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)


class CardDetailSerializer(serializers.ModelSerializer):
    holder_id = serializers.SerializerMethodField()
    profile_code = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    id_card_number = serializers.SerializerMethodField()
    member_valid_from = serializers.SerializerMethodField()
    member_valid_to = serializers.SerializerMethodField()
    card_status = serializers.SerializerMethodField()
    generated_at = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Card
        fields = [
            'id',
            'card_id',
            'holder_type',
            'holder_id',
            'version',
            'is_current',
            'profile_code',
            'full_name',
            'photo_url',
            'id_card_number',
            'qr_value',
            'barcode_value',
            'member_valid_from',
            'member_valid_to',
            'card_status',
            'generated_at',
            'regenerate_reason',
            'replaced_at',
        ]
        read_only_fields = fields

    def _member_validity_cache(self):
        cache = self.context.setdefault('_member_validity_cache', {})
        return cache

    def _get_member_validity(self, obj: Card):
        if obj.holder_type != Card.HOLDER_TYPE_MEMBER or obj.member_id is None:
            return None, None
        cache = self._member_validity_cache()
        if obj.member_id not in cache:
            cache[obj.member_id] = build_member_validity(obj.member_id)
        return cache[obj.member_id]

    def get_holder_id(self, obj: Card):
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER:
            return obj.member_id
        return obj.staff_id

    def get_profile_code(self, obj: Card):
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER and obj.member:
            return obj.member.member_code
        if obj.holder_type == Card.HOLDER_TYPE_STAFF and obj.staff:
            return obj.staff.staff_code
        return ''

    def get_full_name(self, obj: Card):
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER and obj.member:
            return f'{obj.member.first_name} {obj.member.last_name}'.strip()
        if obj.holder_type == Card.HOLDER_TYPE_STAFF and obj.staff:
            return f'{obj.staff.first_name} {obj.staff.last_name}'.strip()
        return ''

    def get_photo_url(self, obj: Card):
        image = None
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER and obj.member:
            image = obj.member.profile_picture
        elif obj.holder_type == Card.HOLDER_TYPE_STAFF and obj.staff:
            image = obj.staff.profile_picture

        if not image:
            return None

        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image.url)
        return image.url

    def get_id_card_number(self, obj: Card):
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER and obj.member:
            return obj.member.id_card_number
        if obj.holder_type == Card.HOLDER_TYPE_STAFF and obj.staff:
            return obj.staff.id_card_number
        return None

    def get_member_valid_from(self, obj: Card):
        valid_from, _ = self._get_member_validity(obj)
        return valid_from

    def get_member_valid_to(self, obj: Card):
        _, valid_to = self._get_member_validity(obj)
        return valid_to

    def get_card_status(self, obj: Card):
        if obj.holder_type == Card.HOLDER_TYPE_MEMBER and obj.member:
            _, valid_to = self._get_member_validity(obj)
            return compute_member_card_status(obj.member, valid_to)
        if obj.holder_type == Card.HOLDER_TYPE_STAFF and obj.staff:
            return obj.staff.employment_status
        return 'expired'

