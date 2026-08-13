from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from members.models import Member
from staff.models import Staff
from system_settings.models import GymProfileSettings, MembershipPlanTemplate
from trainers.models import Trainer


class Command(BaseCommand):
    help = "Create safe, repeatable demonstration records for the Gym MIS presentation."

    @transaction.atomic
    def handle(self, *args, **options):
        gym, _ = GymProfileSettings.all_objects.get_or_create(pk=1)
        if gym.gym_name in {"", "Gym MIS"}:
            gym.gym_name = "Afghan Private Gym"
            gym.address = "Kabul, Afghanistan"
            gym.phone_number = "0700000000"
            gym.save(update_fields=["gym_name", "address", "phone_number", "updated_at"])

        basic, _ = MembershipPlanTemplate.objects.get_or_create(
            name="Demo Monthly Plan",
            defaults={
                "duration_type": "monthly",
                "duration_months": 1,
                "fee": Decimal("1500.00"),
                "description": "Monthly membership plan for demonstration.",
                "is_active": True,
            },
        )
        MembershipPlanTemplate.objects.get_or_create(
            name="Demo Quarterly Plan",
            defaults={
                "duration_type": "quarterly",
                "duration_months": 3,
                "fee": Decimal("4000.00"),
                "description": "Three-month membership plan for demonstration.",
                "is_active": True,
            },
        )

        member_rows = [
            ("Ahmad", "Rahimi", "0701000001", "DEMO-M-001", "active"),
            ("Farid", "Ahmadi", "0701000002", "DEMO-M-002", "active"),
            ("Sami", "Karimi", "0701000003", "DEMO-M-003", "active"),
            ("Laila", "Noori", "0701000004", "DEMO-M-004", "active"),
            ("Maryam", "Haidari", "0701000005", "DEMO-M-005", "inactive"),
        ]
        for offset, (first_name, last_name, phone, id_card, status) in enumerate(member_rows):
            Member.objects.get_or_create(
                id_card_number=id_card,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "address": "Kabul, Afghanistan",
                    "blood_group": "O+",
                    "join_date": date.today() - timedelta(days=offset * 12),
                    "membership_plan_template": basic,
                    "status": status,
                    "height_cm": Decimal("175.00"),
                    "weight_kg": Decimal("72.00"),
                },
            )

        staff_rows = [
            ("manager", "Omar", "Jalali", "0702000001", "DEMO-S-001", Decimal("25000.00")),
            ("trainer", "Hamid", "Sadiqi", "0702000002", "DEMO-S-002", Decimal("18000.00")),
            ("cleaner", "Nasir", "Wali", "0702000003", "DEMO-S-003", Decimal("12000.00")),
        ]
        for position, first_name, last_name, mobile, id_card, salary in staff_rows:
            Staff.objects.get_or_create(
                id_card_number=id_card,
                defaults={
                    "position": position,
                    "first_name": first_name,
                    "last_name": last_name,
                    "mobile_number": mobile,
                    "date_hired": date.today() - timedelta(days=180),
                    "monthly_salary": salary,
                    "salary_status": "unpaid",
                    "employment_status": "active",
                },
            )

        trainer_rows = [
            ("Sahar", "Mohammadi", "0703000001", "DEMO-T-001", ["Fitness", "Cardio"]),
            ("Bilal", "Yousufi", "0703000002", "DEMO-T-002", ["Strength Training"]),
        ]
        for first_name, last_name, mobile, id_card, assigned_classes in trainer_rows:
            Trainer.objects.get_or_create(
                id_card_number=id_card,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "mobile_number": mobile,
                    "date_hired": date.today() - timedelta(days=120),
                    "monthly_salary": Decimal("18000.00"),
                    "salary_status": "unpaid",
                    "employment_status": "active",
                    "assigned_classes": assigned_classes,
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo data is ready: 5 members, 3 staff, 2 trainers, and 2 plans."))
