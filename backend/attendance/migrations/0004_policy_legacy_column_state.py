from django.db import migrations, models


def ensure_legacy_column(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        columns = [
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, "attendance_policy"
            )
        ]
        if "late_counts_as_half_day" not in columns:
            cursor.execute(
                "ALTER TABLE attendance_policy ADD COLUMN late_counts_as_half_day bool DEFAULT TRUE"
            )
            cursor.execute(
                "UPDATE attendance_policy SET late_counts_as_half_day = TRUE "
                "WHERE late_counts_as_half_day IS NULL"
            )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0003_normalize_legacy_schema"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(ensure_legacy_column, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="attendancepolicy",
                    name="late_counts_as_half_day_legacy",
                    field=models.BooleanField(
                        db_column="late_counts_as_half_day",
                        default=True,
                    ),
                ),
            ],
        )
    ]
