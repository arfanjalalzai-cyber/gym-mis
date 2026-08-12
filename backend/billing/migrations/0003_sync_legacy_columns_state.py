from django.db import migrations, models


def _column_names(schema_editor, table_name: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(
            cursor, table_name
        )
    return {column.name for column in description}


def ensure_legacy_columns(apps, schema_editor):
    Bill = apps.get_model("billing", "Bill")
    table_name = Bill._meta.db_table
    if table_name not in schema_editor.connection.introspection.table_names():
        return

    columns = _column_names(schema_editor, table_name)

    if "cycle_month" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN cycle_month date NOT NULL DEFAULT '1970-01-01'"
        )
        schema_editor.execute(
            "UPDATE billing_bills SET cycle_month = billing_date WHERE cycle_month = '1970-01-01'"
        )

    if "member_code_snapshot" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN member_code_snapshot varchar(32) NOT NULL DEFAULT ''"
        )

    if "member_name_snapshot" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN member_name_snapshot varchar(255) NOT NULL DEFAULT ''"
        )

    if "paid_amount" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN paid_amount decimal NOT NULL DEFAULT 0"
        )

    if "remaining_amount" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN remaining_amount decimal NOT NULL DEFAULT 0"
        )

    if "is_locked" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN is_locked bool NOT NULL DEFAULT false"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("billing", "0002_repair_legacy_schema"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    ensure_legacy_columns,
                    reverse_code=migrations.RunPython.noop,
                )
            ],
            state_operations=[
                migrations.AddField(
                    model_name="bill",
                    name="cycle_month",
                    field=models.DateField(default="1970-01-01"),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name="bill",
                    name="member_code_snapshot",
                    field=models.CharField(blank=True, default="", max_length=32),
                ),
                migrations.AddField(
                    model_name="bill",
                    name="member_name_snapshot",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="bill",
                    name="paid_amount",
                    field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                migrations.AddField(
                    model_name="bill",
                    name="remaining_amount",
                    field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                migrations.AddField(
                    model_name="bill",
                    name="is_locked",
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]

