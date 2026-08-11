import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { settingsService } from "../services";
import type {
  BackupScheduleSettings,
  BillingSettingsPayload,
  GymProfilePayload,
  MembershipPlanPayload,
  NotificationSettingsPayload,
  RoleWithPermissions,
  SecuritySettings,
  SettingsRoleName,
  SettingsUserCreatePayload,
  SettingsUserUpdatePayload,
  SystemPreferenceSettings,
} from "../types";

export const settingsKeys = {
  all: ["settings"] as const,
  gym: () => [...settingsKeys.all, "gym"] as const,
  users: (params?: Record<string, unknown>) => [...settingsKeys.all, "users", params] as const,
  roles: () => [...settingsKeys.all, "roles"] as const,
  modulesActions: () => [...settingsKeys.all, "modules-actions"] as const,
  membershipPlans: (params?: Record<string, unknown>) => [...settingsKeys.all, "membership-plans", params] as const,
  billing: () => [...settingsKeys.all, "billing"] as const,
  notification: () => [...settingsKeys.all, "notification"] as const,
  security: () => [...settingsKeys.all, "security"] as const,
  securityActivityLogs: (params?: Record<string, unknown>) => [...settingsKeys.all, "security-logs", params] as const,
  systemPreferences: () => [...settingsKeys.all, "system-preferences"] as const,
  backups: (params?: Record<string, unknown>) => [...settingsKeys.all, "backups", params] as const,
  backupSchedule: () => [...settingsKeys.all, "backup-schedule"] as const,
  systemLogs: (params?: Record<string, unknown>) => [...settingsKeys.all, "system-logs", params] as const,
};

export const useGymProfile = () =>
  useQuery({
    queryKey: settingsKeys.gym(),
    queryFn: () => settingsService.getGymProfile().then((res) => res.data),
  });

export const useUpdateGymProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GymProfilePayload) => settingsService.updateGymProfile(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Gym profile saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.gym() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save gym profile")),
  });
};

export const useUploadGymLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsService.uploadGymLogo(file).then((res) => res.data),
    onSuccess: () => {
      toast.success("Logo updated");
      queryClient.invalidateQueries({ queryKey: settingsKeys.gym() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to upload logo")),
  });
};

export const useDeleteGymLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.deleteGymLogo().then((res) => res.data),
    onSuccess: () => {
      toast.success("Logo removed");
      queryClient.invalidateQueries({ queryKey: settingsKeys.gym() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to remove logo")),
  });
};

export const useUploadLoginPageImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsService.uploadLoginPageImage(file).then((res) => res.data),
    onSuccess: () => {
      toast.success("Login page image updated");
      queryClient.invalidateQueries({ queryKey: settingsKeys.gym() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to upload login page image")),
  });
};

export const useDeleteLoginPageImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.deleteLoginPageImage().then((res) => res.data),
    onSuccess: () => {
      toast.success("Login page image removed");
      queryClient.invalidateQueries({ queryKey: settingsKeys.gym() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to remove login page image")),
  });
};

export const useSettingsUsers = (params?: { page?: number; search?: string; role?: SettingsRoleName }) =>
  useQuery({
    queryKey: settingsKeys.users(params),
    queryFn: () => settingsService.getUsers(params).then((res) => res.data),
  });

export const useCreateSettingsUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsUserCreatePayload) => settingsService.createUser(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to create user")),
  });
};

export const useUpdateSettingsUser = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsUserUpdatePayload) => settingsService.updateUser(id, payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to update user")),
  });
};

export const useDisableSettingsUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.disableUser(id),
    onSuccess: () => {
      toast.success("User disabled");
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to disable user")),
  });
};

export const useEnableSettingsUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.enableUser(id),
    onSuccess: () => {
      toast.success("User enabled");
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to enable user")),
  });
};

export const useChangeManagedUserPassword = (id: number) =>
  useMutation({
    mutationFn: (payload: { new_password: string }) => settingsService.changeUserPassword(id, payload),
    onSuccess: () => toast.success("Password changed"),
    onError: (error) => toast.error(extractAxiosError(error, "Failed to change password")),
  });

export const useRoles = (enabled = true) =>
  useQuery({
    queryKey: settingsKeys.roles(),
    queryFn: () => settingsService.getRoles().then((res) => res.data),
    enabled,
  });

export const useModulesActions = (enabled = true) =>
  useQuery({
    queryKey: settingsKeys.modulesActions(),
    queryFn: () => settingsService.getModulesActions().then((res) => res.data),
    enabled,
  });

export const useUpdateRolePermissions = (roleName: SettingsRoleName) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: RoleWithPermissions["permissions"]) =>
      settingsService.updateRolePermissions(roleName, permissions).then((res) => res.data),
    onSuccess: () => {
      toast.success("Role permissions saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save role permissions")),
  });
};

export const useMembershipPlans = (params?: { page?: number; page_size?: number; is_active?: boolean }) =>
  useQuery({
    queryKey: settingsKeys.membershipPlans(params),
    queryFn: () => settingsService.getMembershipPlans(params).then((res) => res.data),
  });

export const useCreateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MembershipPlanPayload) => settingsService.createMembershipPlan(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Membership plan created");
      queryClient.invalidateQueries({ queryKey: settingsKeys.membershipPlans() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to create plan")),
  });
};

export const useUpdateMembershipPlan = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<MembershipPlanPayload>) => settingsService.updateMembershipPlan(id, payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Membership plan updated");
      queryClient.invalidateQueries({ queryKey: settingsKeys.membershipPlans() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to update plan")),
  });
};

export const useActivateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.activateMembershipPlan(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.membershipPlans() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to activate plan")),
  });
};

export const useDeactivateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.deactivateMembershipPlan(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.membershipPlans() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to deactivate plan")),
  });
};

export const useBillingSettings = () =>
  useQuery({
    queryKey: settingsKeys.billing(),
    queryFn: () => settingsService.getBillingSettings().then((res) => res.data),
  });

export const useUpdateBillingSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillingSettingsPayload) => settingsService.updateBillingSettings(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Billing settings saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.billing() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save billing settings")),
  });
};

export const useInvoicePreview = () =>
  useMutation({
    mutationFn: (payload?: Partial<BillingSettingsPayload>) =>
      settingsService.previewInvoiceSequence(payload).then((res) => res.data),
    onError: (error) => toast.error(extractAxiosError(error, "Failed to preview invoice")),
  });

export const useNotificationSettings = () =>
  useQuery({
    queryKey: settingsKeys.notification(),
    queryFn: () => settingsService.getNotificationSettings().then((res) => res.data),
  });

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotificationSettingsPayload) =>
      settingsService.updateNotificationSettings(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Notification settings saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.notification() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save notifications")),
  });
};

export const useTestNotificationEmail = () =>
  useMutation({
    mutationFn: () => settingsService.testNotificationEmail().then((res) => res.data),
    onSuccess: (data) => toast.success(data.detail),
    onError: (error) => toast.error(extractAxiosError(error, "Email test failed")),
  });

export const useTestNotificationSms = () =>
  useMutation({
    mutationFn: () => settingsService.testNotificationSms().then((res) => res.data),
    onSuccess: (data) => toast.success(data.detail),
    onError: (error) => toast.error(extractAxiosError(error, "SMS test failed")),
  });

export const useSecuritySettings = () =>
  useQuery({
    queryKey: settingsKeys.security(),
    queryFn: () => settingsService.getSecuritySettings().then((res) => res.data),
  });

export const useUpdateSecuritySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SecuritySettings) => settingsService.updateSecuritySettings(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Security settings saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.security() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save security settings")),
  });
};

export const useSecurityActivityLogs = (params?: { page?: number; action?: string; user?: string }) =>
  useQuery({
    queryKey: settingsKeys.securityActivityLogs(params),
    queryFn: () => settingsService.getSecurityActivityLogs(params).then((res) => res.data),
  });

export const useSystemPreferences = () =>
  useQuery({
    queryKey: settingsKeys.systemPreferences(),
    queryFn: () => settingsService.getSystemPreferences().then((res) => res.data),
  });

export const useUpdateSystemPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SystemPreferenceSettings) => settingsService.updateSystemPreferences(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("System preferences saved");
      queryClient.invalidateQueries({ queryKey: settingsKeys.systemPreferences() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to save system preferences")),
  });
};

export const useBackups = (params?: { page?: number; page_size?: number }) =>
  useQuery({
    queryKey: settingsKeys.backups(params),
    queryFn: () => settingsService.getBackups(params).then((res) => res.data),
  });

export const useRunManualBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.runManualBackup().then((res) => res.data),
    onSuccess: () => {
      toast.success("Backup completed");
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, "backups"] });
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, "system-logs"] });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to run backup")),
  });
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => settingsService.restoreBackup(id).then((res) => res.data),
    onSuccess: () => {
      toast.success("Backup restored");
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, "backups"] });
      queryClient.invalidateQueries({ queryKey: [...settingsKeys.all, "system-logs"] });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to restore backup")),
  });
};

export const useBackupSchedule = () =>
  useQuery({
    queryKey: settingsKeys.backupSchedule(),
    queryFn: () => settingsService.getBackupSchedule().then((res) => res.data),
  });

export const useUpdateBackupSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BackupScheduleSettings) => settingsService.updateBackupSchedule(payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Backup schedule updated");
      queryClient.invalidateQueries({ queryKey: settingsKeys.backupSchedule() });
    },
    onError: (error) => toast.error(extractAxiosError(error, "Failed to update backup schedule")),
  });
};

export const useSystemLogs = (params?: { limit?: number }) =>
  useQuery({
    queryKey: settingsKeys.systemLogs(params),
    queryFn: () => settingsService.getSystemLogs(params).then((res) => res.data),
  });
