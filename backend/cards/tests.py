from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ROLE_CHOICES, RolePermission, User, UserPermission
from core.models import Permission
from members.models import Member
from payments.models import MemberFeeCycle, MemberFeePlan
from staff.models import Staff
from system_settings.models import MembershipPlanTemplate

from .models import Card


class CardAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls._seed_permissions()
        cls.admin_user = User.objects.create_user(
            username='admin_user_cards',
            password='pass12345',
            role_name='admin',
        )
        cls.receptionist_user = User.objects.create_user(
            username='rec_user_cards',
            password='pass12345',
            role_name='receptionist',
        )
        cls.viewer_user = User.objects.create_user(
            username='viewer_user_cards',
            password='pass12345',
            role_name='viewer',
        )

    @classmethod
    def _seed_permissions(cls):
        allowed_roles = {role for role, _ in ROLE_CHOICES}
        for module in ['members', 'staff']:
            permissions = {}
            for action in ['view', 'add', 'change', 'delete', 'all']:
                permission, _ = Permission.objects.get_or_create(
                    module=module,
                    action=action,
                    defaults={'description': f'Can {action} {module}'},
                )
                permissions[action] = permission

            role_action_map = {
                'admin': ['all'],
                'receptionist': ['view', 'add', 'change'],
                'viewer': ['view'] if module == 'members' else [],
            }
            for role_name, actions in role_action_map.items():
                if role_name not in allowed_roles:
                    continue
                for action in actions:
                    RolePermission.objects.get_or_create(
                        role_name=role_name,
                        permission=permissions[action],
                    )

    def setUp(self):
        self.member = Member.objects.create(
            first_name='Ali',
            last_name='Member',
            phone='0700000001',
            status='active',
        )
        self.staff = Staff.objects.create(
            position='clerk',
            first_name='Sara',
            last_name='Staff',
            mobile_number='0700000002',
            date_hired='2026-02-20',
            monthly_salary=Decimal('10000'),
            salary_status='unpaid',
            employment_status='active',
        )
        self.member_generate_url = f'/api/members/members/{self.member.id}/card/generate/'
        self.member_regenerate_url = f'/api/members/members/{self.member.id}/card/regenerate/'
        self.member_card_url = f'/api/members/members/{self.member.id}/card/'
        self.staff_generate_url = f'/api/staff/staff/{self.staff.id}/card/generate/'
        self.staff_card_url = f'/api/staff/staff/{self.staff.id}/card/'

    def _create_paid_cycle(self, member: Member, cycle_month: date):
        plan = MemberFeePlan.objects.create(
            member=member,
            billing_cycle='monthly',
            cycle_fee_amount=Decimal('2000.00'),
            default_cycle_discount_amount=Decimal('0.00'),
            currency='AFN',
            effective_from=cycle_month,
        )
        MemberFeeCycle.objects.create(
            member=member,
            plan=plan,
            cycle_month=cycle_month.replace(day=1),
            base_due_amount=Decimal('2000.00'),
            cycle_discount_amount=Decimal('0.00'),
            net_due_amount=Decimal('2000.00'),
            paid_amount=Decimal('2000.00'),
            payment_discount_amount=Decimal('0.00'),
            remaining_amount=Decimal('0.00'),
            status='paid',
        )

    def test_card_id_sequence_generation_by_holder_type(self):
        self.client.force_authenticate(user=self.admin_user)
        second_member = Member.objects.create(
            first_name='Jamal',
            last_name='Second',
            phone='0700000100',
            status='active',
        )
        response_1 = self.client.post(self.member_generate_url)
        response_2 = self.client.post(f'/api/members/members/{second_member.id}/card/generate/')
        response_3 = self.client.post(self.staff_generate_url)

        self.assertEqual(response_1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_3.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_1.data['card_id'], 'MCD-000001')
        self.assertEqual(response_2.data['card_id'], 'MCD-000002')
        self.assertEqual(response_3.data['card_id'], 'SCD-000001')

    def test_initial_generation_creates_version_one(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(self.member_generate_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['version'], 1)
        self.assertTrue(response.data['is_current'])

    def test_duplicate_initial_generation_returns_409(self):
        self.client.force_authenticate(user=self.admin_user)
        first = self.client.post(self.member_generate_url)
        second = self.client.post(self.member_generate_url)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)

    def test_regenerate_creates_next_version_and_deactivates_old(self):
        self.client.force_authenticate(user=self.admin_user)
        first = self.client.post(self.member_generate_url)
        second = self.client.post(self.member_regenerate_url, {'reason': 'Lost card'}, format='json')

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.data['version'], 2)
        self.assertTrue(second.data['is_current'])
        self.assertEqual(second.data['regenerate_reason'], 'Lost card')

        old_card = Card.objects.get(card_id=first.data['card_id'])
        self.assertFalse(old_card.is_current)
        self.assertIsNotNone(old_card.replaced_at)
        self.assertIsNotNone(old_card.replaced_by_id)

    def test_member_status_active_with_paid_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        month_start = timezone.localdate().replace(day=1)
        self._create_paid_cycle(member=self.member, cycle_month=month_start)

        self.client.post(self.member_generate_url)
        detail = self.client.get(self.member_card_url)
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['card_status'], 'active')
        self.assertEqual(detail.data['member_valid_from'], month_start)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        self.assertEqual(detail.data['member_valid_to'], next_month - timedelta(days=1))

    def test_member_validity_falls_back_to_fee_plan_when_no_paid_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        template = MembershipPlanTemplate.objects.create(
            name='Monthly',
            duration_type='monthly',
            duration_months=1,
            fee=Decimal('2000.00'),
            is_active=True,
        )
        self.member.join_date = date(2026, 6, 21)
        self.member.membership_plan_template = template
        self.member.save(update_fields=['join_date', 'membership_plan_template', 'updated_at'])
        MemberFeePlan.objects.create(
            member=self.member,
            plan_template=template,
            billing_cycle='monthly',
            cycle_fee_amount=Decimal('2000.00'),
            currency='AFN',
            effective_from=self.member.join_date,
        )

        self.client.post(self.member_generate_url)
        detail = self.client.get(self.member_card_url)

        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['member_valid_from'], date(2026, 6, 21))
        self.assertEqual(detail.data['member_valid_to'], date(2026, 7, 20))

    def test_member_status_expired_without_paid_cycle(self):
        self.client.force_authenticate(user=self.admin_user)
        self.client.post(self.member_generate_url)
        detail = self.client.get(self.member_card_url)
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['card_status'], 'expired')

    def test_inactive_member_cannot_generate_card(self):
        self.client.force_authenticate(user=self.admin_user)
        month_start = timezone.localdate().replace(day=1)
        self._create_paid_cycle(member=self.member, cycle_month=month_start)
        self.member.status = 'inactive'
        self.member.save(update_fields=['status', 'updated_at'])

        response = self.client.post(self.member_generate_url)
        detail = self.client.get(self.member_card_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Inactive members cannot generate cards.')
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_member_cannot_regenerate_card(self):
        self.client.force_authenticate(user=self.admin_user)
        created = self.client.post(self.member_generate_url)
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        self.member.status = 'inactive'
        self.member.save(update_fields=['status', 'updated_at'])

        response = self.client.post(self.member_regenerate_url, {'reason': 'Lost card'}, format='json')
        current_card = Card.objects.get(card_id=created.data['card_id'])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Inactive members cannot regenerate cards.')
        self.assertTrue(current_card.is_current)

    def test_staff_card_status_from_employment_status(self):
        self.client.force_authenticate(user=self.admin_user)
        self.staff.employment_status = 'on_leave'
        self.staff.save(update_fields=['employment_status', 'updated_at'])

        self.client.post(self.staff_generate_url)
        detail = self.client.get(self.staff_card_url)
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['card_status'], 'on_leave')

    def test_lookup_endpoint_unknown_card_returns_404(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('cards:lookup'), {'card_id': 'MCD-999999'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lookup_permission_mismatch_returns_403(self):
        self.client.force_authenticate(user=self.admin_user)
        created = self.client.post(self.staff_generate_url)
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        staff_view_perm = Permission.objects.get(module='staff', action='view')
        UserPermission.objects.update_or_create(
            user=self.viewer_user,
            permission=staff_view_perm,
            defaults={'allow': False},
        )

        self.client.force_authenticate(user=self.viewer_user)
        response = self.client.get(reverse('cards:lookup'), {'card_id': created.data['card_id']})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_can_generate_and_regenerate(self):
        self.client.force_authenticate(user=self.receptionist_user)
        generate = self.client.post(self.member_generate_url)
        regenerate = self.client.post(self.member_regenerate_url, {'reason': 'Damaged'}, format='json')

        self.assertEqual(generate.status_code, status.HTTP_201_CREATED)
        self.assertEqual(regenerate.status_code, status.HTTP_201_CREATED)

    def test_viewer_is_read_only_for_member_card(self):
        self.client.force_authenticate(user=self.admin_user)
        self.client.post(self.member_generate_url)

        self.client.force_authenticate(user=self.viewer_user)
        detail = self.client.get(self.member_card_url)
        generate = self.client.post(self.member_generate_url)
        regenerate = self.client.post(self.member_regenerate_url, {'reason': 'Lost'}, format='json')

        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(generate.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(regenerate.status_code, status.HTTP_403_FORBIDDEN)
