from django.db import migrations


MODEL_NAMES = (
    ("attendance", "AttendancePolicy"), ("attendance", "AttendanceRecord"),
    ("billing", "Bill"), ("cards", "Card"), ("inventory", "Equipment"),
    ("members", "Member"), ("members", "MemberBodyMetricHistory"),
    ("payments", "MemberFeePlan"), ("payments", "MemberFeeCycle"),
    ("payments", "MemberFeePayment"), ("payments", "StaffSalaryPeriod"),
    ("payments", "StaffSalaryPayment"), ("reports", "ExpenseCategory"),
    ("reports", "Expense"), ("schedule", "ScheduleClass"), ("schedule", "ScheduleSlot"),
    ("staff", "Staff"), ("staff", "Trainer"), ("trainers", "Trainer"),
    ("system_settings", "GymProfileSettings"), ("system_settings", "MembershipPlanTemplate"),
    ("system_settings", "BillingSettings"), ("system_settings", "NotificationSettings"),
    ("system_settings", "SecuritySettings"), ("system_settings", "SystemPreferenceSettings"),
    ("system_settings", "BackupScheduleSettings"), ("system_settings", "BackupJob"),
)


def backfill_gym(apps, schema_editor):
    Gym = apps.get_model("accounts", "Gym")
    gym = Gym.objects.get(slug="default")
    for app_label, model_name in MODEL_NAMES:
        apps.get_model(app_label, model_name).objects.filter(gym__isnull=True).update(gym_id=gym.id)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0009_gym_alter_user_managers_and_more"),
        ("attendance", "0008_attendancepolicy_gym_attendancerecord_gym"),
        ("billing", "0004_bill_gym"), ("cards", "0002_card_gym"),
        ("inventory", "0004_equipment_gym"), ("members", "0011_rename_member_body_member__89de2d_idx_member_body_member__8e513e_idx_and_more"),
        ("payments", "0006_memberfeecycle_gym_memberfeepayment_gym_and_more"),
        ("reports", "0005_expense_gym_expensecategory_gym"), ("schedule", "0005_scheduleclass_gym_scheduleslot_gym"),
        ("staff", "0010_staff_gym_trainer_gym"), ("system_settings", "0006_backupjob_gym_backupschedulesettings_gym_and_more"),
        ("trainers", "0003_trainer_gym"),
    ]
    operations = [migrations.RunPython(backfill_gym, migrations.RunPython.noop)]
