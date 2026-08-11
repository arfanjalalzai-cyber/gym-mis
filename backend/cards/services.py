from calendar import monthrange
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from members.models import Member
from payments.models import MemberFeeCycle
from staff.models import Staff

from .models import Card, CardSequence


class CardAlreadyExistsError(Exception):
    pass


class CardNotFoundError(Exception):
    pass


class CardInactiveHolderError(Exception):
    pass


def _resolve_holder(holder_type: str, holder_id: int):
    if holder_type == Card.HOLDER_TYPE_MEMBER:
        return Member.objects.filter(pk=holder_id).first(), {'member_id': holder_id}
    if holder_type == Card.HOLDER_TYPE_STAFF:
        return Staff.objects.filter(pk=holder_id).first(), {'staff_id': holder_id}
    raise ValueError('Invalid holder_type.')


def _next_holder_version(holder_filter: dict) -> int:
    latest = (
        Card.all_objects.filter(**holder_filter)
        .aggregate(max_version=Max('version'))
        .get('max_version')
    )
    return (latest or 0) + 1


def generate_next_card_id(holder_type: str) -> str:
    prefix_map = {
        Card.HOLDER_TYPE_MEMBER: 'MCD',
        Card.HOLDER_TYPE_STAFF: 'SCD',
    }
    prefix = prefix_map.get(holder_type)
    if not prefix:
        raise ValueError('Invalid holder_type.')

    with transaction.atomic():
        sequence, _ = CardSequence.objects.select_for_update().get_or_create(
            holder_type=holder_type,
            defaults={'last_number': 0},
        )
        sequence.last_number += 1
        sequence.save(update_fields=['last_number'])
        return f'{prefix}-{sequence.last_number:06d}'


def get_current_card(holder_type: str, holder_id: int) -> Card | None:
    _, holder_filter = _resolve_holder(holder_type=holder_type, holder_id=holder_id)
    return (
        Card.objects.select_related('member', 'staff', 'generated_by', 'replaced_by')
        .filter(is_current=True, **holder_filter)
        .first()
    )


def list_card_history(holder_type: str, holder_id: int):
    _, holder_filter = _resolve_holder(holder_type=holder_type, holder_id=holder_id)
    return (
        Card.objects.select_related('member', 'staff', 'generated_by', 'replaced_by')
        .filter(**holder_filter)
        .order_by('-version', '-created_at')
    )


def create_initial_card(holder_type: str, holder_id: int, user=None) -> Card:
    holder, holder_filter = _resolve_holder(holder_type=holder_type, holder_id=holder_id)
    if holder is None:
        raise CardNotFoundError('Holder not found.')
    if holder_type == Card.HOLDER_TYPE_MEMBER and holder.status != 'active':
        raise CardInactiveHolderError('Inactive members cannot generate cards.')

    with transaction.atomic():
        current_exists = Card.objects.select_for_update().filter(
            is_current=True, **holder_filter
        ).exists()
        if current_exists:
            raise CardAlreadyExistsError('Current card already exists.')

        version = _next_holder_version(holder_filter=holder_filter)
        card_id = generate_next_card_id(holder_type=holder_type)

        card_payload = {
            'card_id': card_id,
            'holder_type': holder_type,
            'version': version,
            'is_current': True,
            'qr_value': card_id,
            'barcode_value': card_id,
            'generated_by': user,
        }
        card_payload.update(holder_filter)
        return Card.objects.create(**card_payload)


def regenerate_card(holder_type: str, holder_id: int, user=None, reason: str | None = None) -> Card:
    holder, holder_filter = _resolve_holder(holder_type=holder_type, holder_id=holder_id)
    if holder is None:
        raise CardNotFoundError('Holder not found.')
    if holder_type == Card.HOLDER_TYPE_MEMBER and holder.status != 'active':
        raise CardInactiveHolderError('Inactive members cannot regenerate cards.')

    with transaction.atomic():
        current_card = (
            Card.objects.select_for_update()
            .select_related('member', 'staff')
            .filter(is_current=True, **holder_filter)
            .first()
        )
        if current_card is None:
            raise CardNotFoundError('Current card not found.')

        current_card.is_current = False
        current_card.replaced_at = timezone.now()
        current_card.save(update_fields=['is_current', 'replaced_at', 'updated_at'])

        card_id = generate_next_card_id(holder_type=holder_type)
        version = _next_holder_version(holder_filter=holder_filter)

        new_card_payload = {
            'card_id': card_id,
            'holder_type': holder_type,
            'version': version,
            'is_current': True,
            'qr_value': card_id,
            'barcode_value': card_id,
            'generated_by': user,
            'regenerate_reason': reason.strip() if reason else None,
        }
        new_card_payload.update(holder_filter)
        new_card = Card.objects.create(**new_card_payload)

        current_card.replaced_by = new_card
        current_card.save(update_fields=['replaced_by', 'updated_at'])

        return new_card


def _add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _duration_months_from_plan(plan) -> int:
    if plan and plan.plan_template:
        return plan.plan_template.duration_months
    return 1


def build_member_validity(member_id: int):
    latest_paid_cycle = (
        MemberFeeCycle.objects.select_related('plan', 'plan__plan_template')
        .filter(member_id=member_id, status='paid')
        .order_by('-cycle_month')
        .first()
    )
    if latest_paid_cycle is not None:
        valid_from = latest_paid_cycle.cycle_month.replace(day=1)
        duration_months = _duration_months_from_plan(latest_paid_cycle.plan)
        valid_to = _add_months(valid_from, duration_months) - timedelta(days=1)
        return valid_from, valid_to

    member = (
        Member.objects.select_related('fee_plan', 'fee_plan__plan_template', 'membership_plan_template')
        .filter(pk=member_id)
        .first()
    )
    if member is None:
        return None, None

    fee_plan = getattr(member, 'fee_plan', None)
    if fee_plan is not None:
        valid_from = fee_plan.effective_from or member.join_date
        if fee_plan.effective_to is not None:
            return valid_from, fee_plan.effective_to
        duration_months = _duration_months_from_plan(fee_plan)
    elif member.membership_plan_template is not None:
        valid_from = member.join_date
        duration_months = member.membership_plan_template.duration_months
    else:
        return None, None

    valid_to = _add_months(valid_from, duration_months) - timedelta(days=1)
    return valid_from, valid_to


def compute_member_card_status(member: Member, valid_to):
    today = timezone.localdate()
    if member.status == 'active' and valid_to is not None and today <= valid_to:
        return 'active'
    return 'expired'


def can_user_view_holder(user, holder_type: str) -> bool:
    if user.is_superuser:
        return True

    from core.permissions import _user_has_permission

    if holder_type == Card.HOLDER_TYPE_MEMBER:
        module = 'members'
    elif holder_type == Card.HOLDER_TYPE_STAFF:
        module = 'staff'
    else:
        return False
    return _user_has_permission(user, module, 'view') or _user_has_permission(user, module, 'all')


def lookup_card_by_id(card_id: str) -> Card | None:
    return (
        Card.objects.select_related('member', 'staff', 'generated_by', 'replaced_by')
        .filter(card_id=card_id)
        .first()
    )
