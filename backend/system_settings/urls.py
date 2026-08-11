from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BackupJobsAPIView,
    BackupDirectoryBrowseAPIView,
    BackupManualAPIView,
    BackupRestoreAPIView,
    BackupScheduleAPIView,
    BillingSettingsAPIView,
    GymLogoAPIView,
    GymProfileSettingsAPIView,
    InvoiceSequencePreviewAPIView,
    LoginPageImageAPIView,
    MembershipPlanTemplateViewSet,
    ModulesActionsAPIView,
    NotificationSettingsAPIView,
    NotificationTestEmailAPIView,
    NotificationTestSMSAPIView,
    RolePermissionsAPIView,
    RolesAPIView,
    SecurityActivityLogsAPIView,
    SecuritySettingsAPIView,
    SettingsUsersViewSet,
    SystemLogsAPIView,
    SystemPreferenceSettingsAPIView,
)

app_name = "system_settings"

router = DefaultRouter()
router.register(r"users", SettingsUsersViewSet, basename="settings-users")
router.register(r"membership-plans", MembershipPlanTemplateViewSet, basename="settings-membership-plans")

urlpatterns = [
    path("", include(router.urls)),
    path("gym-profile/", GymProfileSettingsAPIView.as_view(), name="gym-profile"),
    path("gym-profile/logo/", GymLogoAPIView.as_view(), name="gym-profile-logo"),
    path("gym-profile/login-image/", LoginPageImageAPIView.as_view(), name="gym-profile-login-image"),
    path("roles/", RolesAPIView.as_view(), name="roles"),
    path("roles/<str:role_name>/permissions/", RolePermissionsAPIView.as_view(), name="role-permissions"),
    path("permissions/modules-actions/", ModulesActionsAPIView.as_view(), name="permissions-modules-actions"),
    path("billing/", BillingSettingsAPIView.as_view(), name="billing"),
    path("billing/invoice-sequence/preview/", InvoiceSequencePreviewAPIView.as_view(), name="billing-invoice-preview"),
    path("notifications/", NotificationSettingsAPIView.as_view(), name="notifications"),
    path("notifications/test-email/", NotificationTestEmailAPIView.as_view(), name="notifications-test-email"),
    path("notifications/test-sms/", NotificationTestSMSAPIView.as_view(), name="notifications-test-sms"),
    path("security/", SecuritySettingsAPIView.as_view(), name="security"),
    path("security/activity-logs/", SecurityActivityLogsAPIView.as_view(), name="security-activity-logs"),
    path("system-preferences/", SystemPreferenceSettingsAPIView.as_view(), name="system-preferences"),
    path("backups/manual/", BackupManualAPIView.as_view(), name="backups-manual"),
    path("backups/directories/", BackupDirectoryBrowseAPIView.as_view(), name="backups-directories"),
    path("backups/", BackupJobsAPIView.as_view(), name="backups"),
    path("backups/<int:job_id>/restore/", BackupRestoreAPIView.as_view(), name="backups-restore"),
    path("backups/schedule/", BackupScheduleAPIView.as_view(), name="backups-schedule"),
    path("system-logs/", SystemLogsAPIView.as_view(), name="system-logs"),
]
