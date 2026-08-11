from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_policy_legacy_column_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancepolicy",
            name="absent_deduction_fraction",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("1.00"),
                max_digits=4,
            ),
        ),
    ]
