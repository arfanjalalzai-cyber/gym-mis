import apiClient from "@/lib/api";
import type {
  ActivityLogItem,
  BackupDirectoryBrowseResponse,
  BackupJob,
  BackupScheduleSettings,
  BillingSettings,
  BillingSettingsPayload,
  GymProfilePayload,
  GymProfileSettings,
  InvoicePreview,
  MembershipPlan,
  MembershipPlanPayload,
  ModuleActions,
  NotificationSettings,
  NotificationSettingsPayload,
  PaginatedResponse,
  RoleWithPermissions,
  SecuritySettings,
  SettingsRoleName,
  SettingsUser,
  SettingsUserCreatePayload,
  SettingsUserUpdatePayload,
  SystemPreferenceSettings,
} from "../types";

export const settingsService = {
  getGymProfile: () => apiClient.get<GymProfileSettings>("/settings/gym-profile/"),
  updateGymProfile: (data: GymProfilePayload) => apiClient.put<GymProfileSettings>("/settings/gym-profile/", data),
  uploadGymLogo: (file: File) => {
    const formData = new FormData();
    formData.append("gym_logo", file);
    return apiClient.post<GymProfileSettings>("/settings/gym-profile/logo/", formData);
  },
  deleteGymLogo: () => apiClient.delete<GymProfileSettings>("/settings/gym-profile/logo/"),
  uploadLoginPageImage: (file: File) => {
    const formData = new FormData();
    formData.append("login_page_image", file);
    return apiClient.post<GymProfileSettings>("/settings/gym-profile/login-image/", formData);
  },
  deleteLoginPageImage: () => apiClient.delete<GymProfileSettings>("/settings/gym-profile/login-image/"),

  getUsers: (params?: { page?: number; page_size?: number; search?: string; role?: SettingsRoleName }) =>
    apiClient.get<PaginatedResponse<SettingsUser>>("/settings/users/", { params }),
  createUser: (data: SettingsUserCreatePayload) => apiClient.post<SettingsUser>("/settings/users/", data),
  updateUser: (id: number, data: SettingsUserUpdatePayload) => apiClient.patch<SettingsUser>(`/settings/users/${id}/`, data),
  disableUser: (id: number) => apiClient.post(`/settings/users/${id}/disable/`),
  enableUser: (id: number) => apiClient.post(`/settings/users/${id}/enable/`),
  changeUserPassword: (id: number, payload: { new_password: string }) =>
    apiClient.post(`/settings/users/${id}/change-password/`, payload),

  getRoles: () => apiClient.get<RoleWithPermissions[]>("/settings/roles/"),
  updateRolePermissions: (roleName: SettingsRoleName, permissions: RoleWithPermissions["permissions"]) =>
    apiClient.put<RoleWithPermissions>(`/settings/roles/${roleName}/permissions/`, { permissions }),
  getModulesActions: () => apiClient.get<ModuleActions[]>("/settings/permissions/modules-actions/"),

  getMembershipPlans: (params?: { page?: number; page_size?: number; is_active?: boolean }) =>
    apiClient.get<PaginatedResponse<MembershipPlan>>("/settings/membership-plans/", { params }),
  createMembershipPlan: (data: MembershipPlanPayload) =>
    apiClient.post<MembershipPlan>("/settings/membership-plans/", data),
  updateMembershipPlan: (id: number, data: Partial<MembershipPlanPayload>) =>
    apiClient.patch<MembershipPlan>(`/settings/membership-plans/${id}/`, data),
  activateMembershipPlan: (id: number) => apiClient.post<MembershipPlan>(`/settings/membership-plans/${id}/activate/`),
  deactivateMembershipPlan: (id: number) =>
    apiClient.post<MembershipPlan>(`/settings/membership-plans/${id}/deactivate/`),

  getBillingSettings: () => apiClient.get<BillingSettings>("/settings/billing/"),
  updateBillingSettings: (data: BillingSettingsPayload) => apiClient.put<BillingSettings>("/settings/billing/", data),
  previewInvoiceSequence: (data?: Partial<BillingSettingsPayload>) =>
    apiClient.post<InvoicePreview>("/settings/billing/invoice-sequence/preview/", {
      amount: data?.discount_value ?? "0.00",
      invoice_prefix: data?.invoice_prefix,
      invoice_padding: data?.invoice_padding,
      invoice_next_sequence: data?.invoice_next_sequence,
    }),

  getNotificationSettings: () => apiClient.get<NotificationSettings>("/settings/notifications/"),
  updateNotificationSettings: (data: NotificationSettingsPayload) =>
    apiClient.put<NotificationSettings>("/settings/notifications/", data),
  testNotificationEmail: () => apiClient.post<{ success: boolean; detail: string }>("/settings/notifications/test-email/"),
  testNotificationSms: () => apiClient.post<{ success: boolean; detail: string }>("/settings/notifications/test-sms/"),

  getSecuritySettings: () => apiClient.get<SecuritySettings>("/settings/security/"),
  updateSecuritySettings: (data: SecuritySettings) => apiClient.put<SecuritySettings>("/settings/security/", data),
  getSecurityActivityLogs: (params?: { page?: number; page_size?: number; action?: string; user?: string }) =>
    apiClient.get<PaginatedResponse<ActivityLogItem>>("/settings/security/activity-logs/", { params }),

  getSystemPreferences: () => apiClient.get<SystemPreferenceSettings>("/settings/system-preferences/"),
  updateSystemPreferences: (data: SystemPreferenceSettings) =>
    apiClient.put<SystemPreferenceSettings>("/settings/system-preferences/", data),

  runManualBackup: () => apiClient.post<BackupJob>("/settings/backups/manual/"),
  getBackups: (params?: { page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<BackupJob>>("/settings/backups/", { params }),
  restoreBackup: (id: number) => apiClient.post<BackupJob>(`/settings/backups/${id}/restore/`, { confirm: true }),
  getBackupSchedule: () => apiClient.get<BackupScheduleSettings>("/settings/backups/schedule/"),
  browseBackupDirectories: (path?: string) =>
    apiClient.get<BackupDirectoryBrowseResponse>("/settings/backups/directories/", { params: { path } }),
  updateBackupSchedule: (data: BackupScheduleSettings) =>
    apiClient.put<BackupScheduleSettings>("/settings/backups/schedule/", data),

  getSystemLogs: (params?: { limit?: number }) =>
    apiClient.get<{ count: number; results: ActivityLogItem[]; generated_at: string }>("/settings/system-logs/", { params }),
};
