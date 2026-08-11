from __future__ import annotations

import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ActivityLog, RolePermission, User
from core.permissions import _user_has_permission
from core.models import Permission

from .models import BackupJob, BackupScheduleSettings, BillingSettings, GymProfileSettings
from .services import create_manual_sqlite_backup, resolve_backup_directory_value


class SettingsEndpointsTests(APITestCase):
    def setUp(self):
        self._seed_permissions()

        self.admin_user = User.objects.create_user(
            username="admin_user",
            password="AdminPass123!",
            role_name="admin",
            email="admin@example.com",
        )
        self.manager_user = User.objects.create_user(
            username="manager_user",
            password="ManagerPass123!",
            role_name="manager",
            email="manager@example.com",
        )
        self.staff_user = User.objects.create_user(
            username="staff_user",
            password="StaffPass123!",
            role_name="staff",
            email="staff@example.com",
        )
        self.other_user = User.objects.create_user(
            username="another_user",
            password="AnotherPass123!",
            role_name="staff",
            email="another@example.com",
        )

    def _seed_permissions(self):
        action_map = {
            "admin": ("view", "add", "change", "delete"),
            "manager": ("view", "add", "change"),
            "staff": ("view",),
        }

        for role_name, actions in action_map.items():
            for action in actions:
                permission, _ = Permission.objects.get_or_create(
                    module="settings",
                    action=action,
                    defaults={"description": f"Can {action} settings"},
                )
                RolePermission.objects.get_or_create(role_name=role_name, permission=permission)

    def test_user_cannot_disable_self(self):
        self.client.force_authenticate(self.manager_user)

        url = f"/api/settings/users/{self.manager_user.id}/disable/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot disable your own account", response.data.get("detail", "").lower())

    def test_gym_profile_can_be_loaded_without_login(self):
        response = self.client.get("/api/settings/gym-profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("gym_name", response.data)

    def test_gym_profile_update_still_requires_login(self):
        response = self.client.put(
            "/api/settings/gym-profile/",
            {"gym_name": "Blocked Gym"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_can_disable_other_user(self):
        self.client.force_authenticate(self.manager_user)

        url = f"/api/settings/users/{self.other_user.id}/disable/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.other_user.refresh_from_db()
        self.assertFalse(self.other_user.is_active)

    def test_manager_without_settings_change_permission_cannot_modify_settings(self):
        RolePermission.objects.filter(role_name="manager", permission__module="settings").delete()
        self.client.force_authenticate(self.manager_user)

        profile_response = self.client.put(
            "/api/settings/gym-profile/",
            {"gym_name": "Blocked Gym"},
            format="json",
        )
        security_response = self.client.put(
            "/api/settings/security/",
            {
                "min_password_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_number": True,
                "require_special": True,
                "two_factor_enabled": False,
                "login_attempt_limit": 5,
                "lockout_minutes": 30,
            },
            format="json",
        )

        self.assertEqual(profile_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(security_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_legacy_receptionist_permissions_do_not_grant_manager_access(self):
        permission, _ = Permission.objects.get_or_create(
            module="members",
            action="change",
            defaults={"description": "Can change members"},
        )
        RolePermission.objects.filter(role_name="manager", permission=permission).delete()
        RolePermission.objects.get_or_create(role_name="receptionist", permission=permission)

        self.assertFalse(_user_has_permission(self.manager_user, "members", "change"))

    def test_backup_manual_requires_admin(self):
        self.client.force_authenticate(self.manager_user)

        response = self.client.post("/api/settings/backups/manual/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_role_permissions_are_admin_only(self):
        self.client.force_authenticate(self.manager_user)

        roles_response = self.client.get("/api/settings/roles/")
        modules_response = self.client.get("/api/settings/permissions/modules-actions/")
        update_response = self.client.put(
            "/api/settings/roles/staff/permissions/",
            {"permissions": [{"module": "members", "actions": ["view"]}]},
            format="json",
        )

        self.assertEqual(roles_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(modules_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_load_and_update_role_permissions(self):
        self.client.force_authenticate(self.admin_user)
        Permission.objects.get_or_create(
            module="members",
            action="view",
            defaults={"description": "Can view members"},
        )

        roles_response = self.client.get("/api/settings/roles/")
        modules_response = self.client.get("/api/settings/permissions/modules-actions/")
        update_response = self.client.put(
            "/api/settings/roles/staff/permissions/",
            {"permissions": [{"module": "members", "actions": ["view"]}]},
            format="json",
        )

        self.assertEqual(roles_response.status_code, status.HTTP_200_OK)
        self.assertEqual(modules_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["name"], "staff")

    @patch("system_settings.views.create_manual_sqlite_backup")
    def test_backup_manual_admin_success(self, backup_mock):
        job = BackupJob.objects.create(
            job_type="manual",
            status="success",
            file_path="C:/tmp/test.sqlite3",
            file_size_bytes=1024,
            triggered_by=self.admin_user,
        )
        backup_mock.return_value = job

        self.client.force_authenticate(self.admin_user)
        response = self.client.post("/api/settings/backups/manual/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["job_type"], "manual")
        backup_mock.assert_called_once()

    def test_manual_backup_creates_valid_sqlite_file(self):
        schedule = BackupScheduleSettings.get_solo()
        with TemporaryDirectory() as backup_dir:
            source_db = f"{backup_dir}/source.sqlite3"
            connection = sqlite3.connect(source_db)
            try:
                connection.execute("CREATE TABLE smoke_test (id integer primary key, name text)")
                connection.execute("INSERT INTO smoke_test (name) VALUES ('ok')")
                connection.execute(
                    """
                    CREATE TABLE system_settings_backup_jobs (
                        id integer primary key,
                        job_type varchar(20),
                        status varchar(20),
                        file_path varchar(1000),
                        file_size_bytes bigint,
                        started_at datetime,
                        completed_at datetime,
                        error_message text,
                        created_at datetime,
                        updated_at datetime,
                        deleted_at datetime,
                        triggered_by_id bigint
                    )
                    """
                )
                connection.commit()
            finally:
                connection.close()

            schedule.backup_directory = backup_dir
            schedule.save()

            with override_settings(
                DATABASES={
                    "default": {
                        "ENGINE": "django.db.backends.sqlite3",
                        "NAME": source_db,
                    }
                }
            ):
                job = create_manual_sqlite_backup(triggered_by=self.admin_user)

            self.assertEqual(job.status, "success")
            self.assertGreater(job.file_size_bytes, 0)
            self.assertTrue(job.file_path.endswith(".sqlite3"))
            backup_connection = sqlite3.connect(job.file_path)
            try:
                status_row = backup_connection.execute(
                    "SELECT status FROM system_settings_backup_jobs WHERE id = ?",
                    (job.id,),
                ).fetchone()
            finally:
                backup_connection.close()
            self.assertEqual(status_row[0], "success")

    def test_backup_directory_desktop_alias_uses_user_desktop(self):
        resolved = resolve_backup_directory_value("Desktop")

        self.assertEqual(resolved, Path.home() / "Desktop")

    def test_restore_rejects_failed_backup_job(self):
        self.client.force_authenticate(self.admin_user)
        failed_job = BackupJob.objects.create(
            job_type="manual",
            status="failed",
            file_path="",
            triggered_by=self.admin_user,
        )

        response = self.client.post(
            f"/api/settings/backups/{failed_job.id}/restore/",
            {"confirm": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("successful backup", response.data.get("detail", "").lower())

    @patch("system_settings.views.create_manual_sqlite_backup")
    def test_backup_request_is_written_to_activity_logs(self, backup_mock):
        job = BackupJob.objects.create(
            job_type="manual",
            status="success",
            file_path="C:/tmp/test.sqlite3",
            file_size_bytes=1024,
            triggered_by=self.admin_user,
        )
        backup_mock.return_value = job

        self.client.force_authenticate(self.admin_user)
        response = self.client.post("/api/settings/backups/manual/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ActivityLog.objects.filter(
                user=self.admin_user,
                action="create",
                table_name="settings_backups",
            ).exists()
        )

    def test_logo_upload_rejects_non_image_mime(self):
        self.client.force_authenticate(self.manager_user)

        bad_file = SimpleUploadedFile("logo.txt", b"not-an-image", content_type="text/plain")
        response = self.client.post(
            "/api/settings/gym-profile/logo/",
            {"gym_logo": bad_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid logo file type", response.data.get("detail", "").lower())

    def test_logo_upload_restores_soft_deleted_gym_profile(self):
        self.client.force_authenticate(self.manager_user)

        settings_obj = GymProfileSettings.get_solo()
        settings_obj.soft_delete()

        logo = SimpleUploadedFile("logo.png", b"fake-png-content", content_type="image/png")
        response = self.client.post(
            "/api/settings/gym-profile/logo/",
            {"gym_logo": logo},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        settings_obj.refresh_from_db()
        self.assertIsNone(settings_obj.deleted_at)
        self.assertTrue(response.data["gym_logo_url"].endswith(".png"))

    def test_security_policy_change_applies_to_managed_password_change(self):
        self.client.force_authenticate(self.manager_user)

        update_response = self.client.put(
            "/api/settings/security/",
            {
                "min_password_length": 12,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_number": True,
                "require_special": True,
                "two_factor_enabled": False,
                "login_attempt_limit": 5,
                "lockout_minutes": 30,
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        weak_response = self.client.post(
            f"/api/settings/users/{self.other_user.id}/change-password/",
            {"new_password": "Short1!"},
            format="json",
        )
        self.assertEqual(weak_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_security_activity_logs_filter_user_by_display_name(self):
        self.client.force_authenticate(self.manager_user)
        self.other_user.first_name = "Zakim"
        self.other_user.last_name = "Qalandari"
        self.other_user.save(update_fields=["first_name", "last_name"])
        ActivityLog.objects.create(
            user=self.other_user,
            action="create",
            table_name="billing_bills",
            ip_address="127.0.0.1",
        )

        response = self.client.get("/api/settings/security/activity-logs/?user=Zakim Qalandari")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["user_name"], "Zakim Qalandari")

    def test_invoice_preview_accepts_unsaved_form_values(self):
        self.client.force_authenticate(self.manager_user)
        settings_obj = BillingSettings.get_solo()
        settings_obj.invoice_prefix = "INV"
        settings_obj.invoice_padding = 6
        settings_obj.invoice_next_sequence = 1
        settings_obj.save()

        response = self.client.post(
            "/api/settings/billing/invoice-sequence/preview/",
            {
                "invoice_prefix": "GYM",
                "invoice_padding": 3,
                "invoice_next_sequence": 12,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["invoice_number"], "GYM-012")
        settings_obj.refresh_from_db()
        self.assertEqual(settings_obj.invoice_prefix, "INV")
        self.assertEqual(settings_obj.invoice_next_sequence, 1)
