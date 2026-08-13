from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord
from billing.models import Bill
from inventory.models import Equipment
from members.models import Member
from payments.models import MemberFeeCycle, MemberFeePayment, MemberFeePlan, StaffSalaryPeriod
from reports.models import Expense, ExpenseCategory
from schedule.models import ScheduleClass, ScheduleSlot
from staff.models import Staff, Trainer as StaffTrainer
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

        equipment_rows = [
            ("Treadmill Pro", "machine", "cardio", 3, 3, "operational"),
            ("Exercise Bike", "machine", "cardio", 4, 4, "in_use"),
            ("Dumbbell Set", "accessory", "free_weight", 20, 16, None),
            ("Yoga Mat", "accessory", "functional", 15, 10, None),
            ("Protein Shake", "consumable", "nutrition", 24, 0, None),
        ]
        for name, item_type, category, on_hand, in_service, machine_status in equipment_rows:
            Equipment.objects.get_or_create(
                name=name,
                defaults={
                    "item_type": item_type,
                    "category": category,
                    "quantity_on_hand": on_hand,
                    "quantity_in_service": in_service,
                    "machine_status": machine_status,
                    "notes": "Demo inventory item.",
                },
            )

        fitness_class, _ = ScheduleClass.objects.get_or_create(
            name="Demo Fitness Class",
            defaults={"description": "General fitness demonstration class.", "max_capacity": 20},
        )
        cardio_class, _ = ScheduleClass.objects.get_or_create(
            name="Demo Cardio Class",
            defaults={"description": "Cardio demonstration class.", "max_capacity": 15},
        )
        trainer_staff = Staff.objects.get(id_card_number="DEMO-S-002")
        staff_trainer, _ = StaffTrainer.objects.get_or_create(staff=trainer_staff)
        staff_trainer.assigned_classes.add(fitness_class, cardio_class)
        ScheduleSlot.objects.get_or_create(
            schedule_class=fitness_class,
            trainer=staff_trainer,
            weekday=0,
            start_time=time(8, 0),
            defaults={"end_time": time(9, 0), "effective_from": date.today()},
        )
        ScheduleSlot.objects.get_or_create(
            schedule_class=cardio_class,
            trainer=staff_trainer,
            weekday=2,
            start_time=time(17, 0),
            defaults={"end_time": time(18, 0), "effective_from": date.today()},
        )

        month_start = date.today().replace(day=1)
        demo_members = list(Member.objects.filter(id_card_number__startswith="DEMO-M-").order_by("id"))
        for index, member in enumerate(demo_members):
            fee_plan, _ = MemberFeePlan.objects.get_or_create(
                member=member,
                defaults={
                    "plan_template": basic,
                    "billing_cycle": "monthly",
                    "cycle_fee_amount": Decimal("1500.00"),
                    "currency": "AFN",
                    "effective_from": month_start,
                },
            )
            paid = Decimal("1500.00") if index == 0 else (Decimal("800.00") if index == 1 else Decimal("0.00"))
            remaining = Decimal("1500.00") - paid
            fee_cycle, _ = MemberFeeCycle.objects.get_or_create(
                member=member,
                cycle_month=month_start,
                defaults={
                    "plan": fee_plan,
                    "base_due_amount": Decimal("1500.00"),
                    "net_due_amount": Decimal("1500.00"),
                    "paid_amount": paid,
                    "remaining_amount": remaining,
                    "status": "paid" if paid == Decimal("1500.00") else ("partial" if paid else "unpaid"),
                },
            )
            if paid:
                MemberFeePayment.objects.get_or_create(
                    cycle=fee_cycle,
                    amount_paid=paid,
                    defaults={
                        "member": member,
                        "payment_method": "cash",
                        "paid_at": timezone.now() - timedelta(days=index + 1),
                        "note": "Demo membership payment.",
                    },
                )
            Bill.objects.get_or_create(
                cycle=fee_cycle,
                defaults={
                    "bill_number": f"DEMO-BILL-{member.id}",
                    "member": member,
                    "schedule_class": fitness_class,
                    "billing_date": date.today(),
                    "cycle_month": month_start,
                    "member_code_snapshot": member.member_code,
                    "member_name_snapshot": f"{member.first_name} {member.last_name}",
                    "member_full_name_snapshot": f"{member.first_name} {member.last_name}",
                    "member_status_snapshot": member.status,
                    "class_name_snapshot": fitness_class.name,
                    "plan_label_snapshot": basic.name,
                    "original_fee_amount": Decimal("1500.00"),
                    "final_amount": Decimal("1500.00"),
                    "paid_amount": paid,
                    "remaining_amount": remaining,
                    "payment_status": "paid" if paid == Decimal("1500.00") else ("partial" if paid else "unpaid"),
                },
            )

        for staff in Staff.objects.filter(id_card_number__startswith="DEMO-S-"):
            StaffSalaryPeriod.objects.get_or_create(
                staff=staff,
                period_month=month_start,
                defaults={
                    "gross_salary_amount": staff.monthly_salary,
                    "remaining_amount": staff.monthly_salary,
                    "status": "unpaid",
                },
            )
            AttendanceRecord.objects.get_or_create(
                staff=staff,
                attendance_date=date.today(),
                defaults={"status": "present", "note": "Demo attendance record."},
            )

        maintenance, _ = ExpenseCategory.objects.get_or_create(name="Maintenance")
        Expense.objects.get_or_create(
            expense_name="Demo equipment maintenance",
            expense_date=date.today(),
            defaults={"amount": Decimal("2500.00"), "category": maintenance.slug, "note": "Demo expense."},
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready across members, staff, trainers, schedule, inventory, payments, billing, attendance, and reports."))
