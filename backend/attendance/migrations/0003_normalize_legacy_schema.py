from django.db import migrations


def _table_exists(schema_editor, table_name: str) -> bool:
    return table_name in schema_editor.connection.introspection.table_names()


def _column_exists(schema_editor, table_name: str, column_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        columns = schema_editor.connection.introspection.get_table_description(
            cursor, table_name
        )
    return any(column.name == column_name for column in columns)


def _index_exists(schema_editor, index_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(
            cursor, "attendance_records"
        )
    return index_name in constraints


def normalize_legacy_schema(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        if _table_exists(schema_editor, "attendance_policies") and not _table_exists(
            schema_editor, "attendance_policy"
        ):
            cursor.execute("ALTER TABLE attendance_policies RENAME TO attendance_policy")

        if _table_exists(schema_editor, "attendance_staff_records") and not _table_exists(
            schema_editor, "attendance_records"
        ):
            cursor.execute("ALTER TABLE attendance_staff_records RENAME TO attendance_records")

        if _table_exists(schema_editor, "attendance_records"):
            if _column_exists(schema_editor, "attendance_records", "recorded_by_id") and not _column_exists(
                schema_editor, "attendance_records", "marked_by_id"
            ):
                cursor.execute(
                    "ALTER TABLE attendance_records RENAME COLUMN recorded_by_id TO marked_by_id"
                )

            if not _index_exists(schema_editor, "att_date_idx"):
                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS att_date_idx ON attendance_records(attendance_date)"
                )
            if not _index_exists(schema_editor, "att_staff_date_idx"):
                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS att_staff_date_idx ON attendance_records(staff_id, attendance_date)"
                )
            if not _index_exists(schema_editor, "att_status_idx"):
                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS att_status_idx ON attendance_records(status)"
                )
            if not _index_exists(schema_editor, "att_created_idx"):
                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS att_created_idx ON attendance_records(created_at)"
                )
            if not _index_exists(schema_editor, "att_rec_unique_staff_date_active"):
                cursor.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS att_rec_unique_staff_date_active "
                    "ON attendance_records(staff_id, attendance_date) WHERE deleted_at IS NULL"
                )

        if _table_exists(schema_editor, "attendance_policy"):
            if not _column_exists(schema_editor, "attendance_policy", "singleton_key"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN singleton_key integer DEFAULT 1"
                )
            if not _column_exists(schema_editor, "attendance_policy", "late_deduction_enabled"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN late_deduction_enabled bool DEFAULT 1"
                )
            if not _column_exists(schema_editor, "attendance_policy", "late_deduction_fraction"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN late_deduction_fraction decimal DEFAULT '0.50'"
                )
            if not _column_exists(schema_editor, "attendance_policy", "leave_is_paid"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN leave_is_paid bool DEFAULT 1"
                )
            if not _column_exists(schema_editor, "attendance_policy", "missing_as_absent"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN missing_as_absent bool DEFAULT 1"
                )
            if not _column_exists(schema_editor, "attendance_policy", "salary_basis"):
                cursor.execute(
                    "ALTER TABLE attendance_policy ADD COLUMN salary_basis varchar(30) DEFAULT 'calendar_days'"
                )

            if _column_exists(schema_editor, "attendance_policy", "late_counts_as_half_day"):
                cursor.execute(
                    "UPDATE attendance_policy "
                    "SET late_deduction_enabled = COALESCE(late_counts_as_half_day, 1)"
                )
            cursor.execute(
                "UPDATE attendance_policy "
                "SET singleton_key = COALESCE(singleton_key, 1), "
                "late_deduction_fraction = COALESCE(late_deduction_fraction, '0.50'), "
                "salary_basis = COALESCE(salary_basis, 'calendar_days')"
            )
            if not _index_exists(schema_editor, "att_policy_singleton_key_uniq"):
                cursor.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS att_policy_singleton_key_uniq "
                    "ON attendance_policy(singleton_key)"
                )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_seed_attendance_permissions"),
    ]

    operations = [
        migrations.RunPython(normalize_legacy_schema, noop_reverse),
    ]
