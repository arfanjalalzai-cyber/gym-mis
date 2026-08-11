from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0006_missing_as_absent_default_false"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancepolicy",
            name="monthly_paid_leave_days",
            field=models.PositiveSmallIntegerField(default=3),
        ),
    ]
