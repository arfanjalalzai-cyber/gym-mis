from django.db import migrations, models


def disable_missing_as_absent(apps, schema_editor):
    AttendancePolicy = apps.get_model("attendance", "AttendancePolicy")
    AttendancePolicy.objects.update(missing_as_absent=False)


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0005_attendancepolicy_absent_deduction_fraction"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attendancepolicy",
            name="missing_as_absent",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(disable_missing_as_absent, migrations.RunPython.noop),
    ]
