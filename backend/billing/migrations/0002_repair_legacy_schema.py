from django.db import migrations


def _column_names(schema_editor, table_name: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(
            cursor, table_name
        )
    return {column.name for column in description}


def repair_legacy_billing_table(apps, schema_editor):
    Bill = apps.get_model("billing", "Bill")
    table_name = Bill._meta.db_table

    if table_name not in schema_editor.connection.introspection.table_names():
        return

    columns = _column_names(schema_editor, table_name)

    if "member_full_name_snapshot" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN member_full_name_snapshot varchar(220) NOT NULL DEFAULT ''"
        )

    if "class_name_snapshot" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN class_name_snapshot varchar(120) NOT NULL DEFAULT ''"
        )

    if "schedule_class_id" not in columns:
        schema_editor.execute(
            "ALTER TABLE billing_bills "
            "ADD COLUMN schedule_class_id bigint NULL "
            "REFERENCES schedule_classes (id) DEFERRABLE INITIALLY DEFERRED"
        )
        schema_editor.execute(
            "CREATE INDEX IF NOT EXISTS billing_bills_schedule_class_id_idx "
            "ON billing_bills (schedule_class_id)"
        )

    columns = _column_names(schema_editor, table_name)
    if "member_name_snapshot" in columns:
        schema_editor.execute(
            "UPDATE billing_bills "
            "SET member_full_name_snapshot = member_name_snapshot "
            "WHERE member_full_name_snapshot = ''"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("schedule", "0004_alter_scheduleslot_trainer"),
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            repair_legacy_billing_table,
            reverse_code=migrations.RunPython.noop,
        ),
    ]

