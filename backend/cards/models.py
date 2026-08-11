from django.conf import settings
from django.db import models
from django.db.models import Q

from core.base_models import BaseModel


class CardSequence(models.Model):
    HOLDER_TYPE_MEMBER = 'member'
    HOLDER_TYPE_STAFF = 'staff'
    HOLDER_TYPE_CHOICES = [
        (HOLDER_TYPE_MEMBER, 'Member'),
        (HOLDER_TYPE_STAFF, 'Staff'),
    ]

    holder_type = models.CharField(max_length=20, choices=HOLDER_TYPE_CHOICES, unique=True)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'cards_sequences'

    def __str__(self):
        return f'{self.holder_type}: {self.last_number}'


class Card(BaseModel):
    HOLDER_TYPE_MEMBER = CardSequence.HOLDER_TYPE_MEMBER
    HOLDER_TYPE_STAFF = CardSequence.HOLDER_TYPE_STAFF
    HOLDER_TYPE_CHOICES = CardSequence.HOLDER_TYPE_CHOICES

    card_id = models.CharField(max_length=20, unique=True, db_index=True)
    holder_type = models.CharField(max_length=20, choices=HOLDER_TYPE_CHOICES)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='cards',
        blank=True,
        null=True,
    )
    staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.CASCADE,
        related_name='cards',
        blank=True,
        null=True,
    )
    version = models.PositiveIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    qr_value = models.CharField(max_length=120)
    barcode_value = models.CharField(max_length=120)
    regenerate_reason = models.TextField(blank=True, null=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='generated_cards',
    )
    replaced_at = models.DateTimeField(blank=True, null=True)
    replaced_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='replaced_cards',
    )

    class Meta:
        db_table = 'cards'
        indexes = [
            models.Index(fields=['holder_type'], name='cards_holder_type_idx'),
            models.Index(fields=['member', 'is_current'], name='cards_member_curr_idx'),
            models.Index(fields=['staff', 'is_current'], name='cards_staff_curr_idx'),
            models.Index(fields=['created_at'], name='cards_created_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        Q(holder_type='member')
                        & Q(member__isnull=False)
                        & Q(staff__isnull=True)
                    )
                    | (
                        Q(holder_type='staff')
                        & Q(staff__isnull=False)
                        & Q(member__isnull=True)
                    )
                ),
                name='cards_holder_fk_chk',
            ),
            models.UniqueConstraint(
                fields=['member'],
                condition=Q(member__isnull=False, is_current=True),
                name='cards_one_current_member_uniq',
            ),
            models.UniqueConstraint(
                fields=['staff'],
                condition=Q(staff__isnull=False, is_current=True),
                name='cards_one_current_staff_uniq',
            ),
            models.UniqueConstraint(
                fields=['member', 'version'],
                condition=Q(member__isnull=False),
                name='cards_member_version_uniq',
            ),
            models.UniqueConstraint(
                fields=['staff', 'version'],
                condition=Q(staff__isnull=False),
                name='cards_staff_version_uniq',
            ),
        ]

    def __str__(self):
        return self.card_id
