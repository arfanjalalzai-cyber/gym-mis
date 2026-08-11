from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_seed_fees_permissions"),
    ]

    operations = [
        migrations.AlterField(
            model_name="memberfeecycle",
            name="plan",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cycles",
                to="payments.memberfeeplan",
            ),
        ),
    ]
