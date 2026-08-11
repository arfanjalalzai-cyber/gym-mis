# Generated manually on 2026-06-27

from decimal import Decimal, ROUND_HALF_UP
from datetime import date

import django.db.models.deletion
from django.db import migrations, models
from django.utils import timezone


def compute_bmi(height_cm, weight_kg):
    if height_cm is None or weight_kg is None or height_cm <= 0 or weight_kg <= 0:
        return None

    height_m = Decimal(height_cm) / Decimal("100")
    return (Decimal(weight_kg) / (height_m * height_m)).quantize(
        Decimal("0.1"),
        rounding=ROUND_HALF_UP,
    )


def bmi_category(bmi):
    if bmi is None:
        return None
    if bmi < Decimal("18.5"):
        return "underweight"
    if bmi < Decimal("25"):
        return "normal"
    if bmi < Decimal("30"):
        return "overweight"
    return "obese"


def backfill_body_metric_history(apps, schema_editor):
    Member = apps.get_model("members", "Member")
    MemberBodyMetricHistory = apps.get_model("members", "MemberBodyMetricHistory")
    now = timezone.now()

    records = []
    for member in Member.objects.filter(height_cm__isnull=False, weight_kg__isnull=False):
        bmi = compute_bmi(member.height_cm, member.weight_kg)
        category = bmi_category(bmi)
        if bmi is None or category is None:
            continue
        records.append(
            MemberBodyMetricHistory(
                member_id=member.id,
                measurement_date=member.updated_at.date() if member.updated_at else member.join_date,
                height_cm=member.height_cm,
                weight_kg=member.weight_kg,
                bmi=bmi,
                bmi_category=category,
                created_at=now,
                updated_at=now,
            )
        )

    MemberBodyMetricHistory.objects.bulk_create(records)


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0009_rename_members_schedule_class_id_idx_members_schedul_9f33e0_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="MemberBodyMetricHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("measurement_date", models.DateField(db_index=True, default=date.today)),
                ("height_cm", models.DecimalField(decimal_places=2, max_digits=5)),
                ("weight_kg", models.DecimalField(decimal_places=2, max_digits=6)),
                ("bmi", models.DecimalField(decimal_places=1, max_digits=4)),
                (
                    "bmi_category",
                    models.CharField(
                        choices=[
                            ("underweight", "Underweight"),
                            ("normal", "Normal"),
                            ("overweight", "Overweight"),
                            ("obese", "Obese"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="body_metric_history",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "db_table": "member_body_metric_history",
                "ordering": ["-measurement_date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="memberbodymetrichistory",
            index=models.Index(fields=["member", "-measurement_date"], name="member_body_member__89de2d_idx"),
        ),
        migrations.AddIndex(
            model_name="memberbodymetrichistory",
            index=models.Index(fields=["created_at"], name="member_body_created_5665af_idx"),
        ),
        migrations.RunPython(backfill_body_metric_history, migrations.RunPython.noop),
    ]
