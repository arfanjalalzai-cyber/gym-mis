export type DurationType = "monthly" | "quarterly" | "yearly";
export type PaymentMethod = "cash" | "bank_transfer" | "online";
export type DiscountMode = "none" | "percentage" | "fixed";
export type BackupFrequency = "daily" | "weekly" | "monthly";
export type SettingsRoleName = "admin" | "manager" | "staff";

export interface GymProfileSettings {
  gym_name: string;
  gym_logo_url: string | null;
  login_page_image_url: string | null;
  address: string;
  phone_number: string;
  email: string;
  website: string;
  working_hours_json: Record<string, string>;
  description: string;
}

export interface GymProfilePayload {
  gym_name: string;
  address: string;
  phone_number: string;
  email: string;
  website?: string;
  working_hours_json?: Record<string, string>;
  description?: string;
}

export interface SettingsUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role_name: SettingsRoleName;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SettingsUserCreatePayload {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone?: string;
  role_name: SettingsRoleName;
  password: string;
}

export interface SettingsUserUpdatePayload {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role_name?: SettingsRoleName;
}

export interface MembershipPlan {
  id: number;
  name: string;
  duration_type: DurationType;
  duration_months: number;
  fee: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlanPayload {
  name: string;
  duration_type: DurationType;
  duration_months: number;
  fee: string;
  description?: string;
  is_active?: boolean;
}

export interface BillingSettings {
  default_currency: string;
  payment_methods_json: PaymentMethod[];
  default_tax_percentage: string | null;
  discount_mode: DiscountMode;
  discount_value: string;
  invoice_prefix: string;
  invoice_padding: number;
  invoice_next_sequence: number;
}

export interface BillingSettingsPayload {
  default_currency: string;
  payment_methods_json: PaymentMethod[];
  default_tax_percentage?: string | null;
  discount_mode: DiscountMode;
  discount_value: string;
  invoice_prefix: string;
  invoice_padding: number;
  invoice_next_sequence: number;
}

export interface InvoicePreview {
  invoice_number: string;
  next_sequence: number;
  currency: string;
}

export interface NotificationSettings {
  membership_expiry_alert_enabled: boolean;
  membership_expiry_days_before: number;
  payment_due_reminder_enabled: boolean;
  payment_due_days_before: number;
  sms_enabled: boolean;
  sms_provider: string;
  sms_sender_id: string;
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  from_email: string;
}

export interface NotificationSettingsPayload extends NotificationSettings {
  smtp_password?: string;
  sms_api_key?: string;
}

export interface SecuritySettings {
  min_password_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  two_factor_enabled: boolean;
  login_attempt_limit: number;
  lockout_minutes: number;
}

export interface SystemPreferenceSettings {
  calendar_system: "gregorian" | "hijri_shamsi" | "hijri_qamari";
  date_format: string;
  time_format: string;
  timezone: string;
}

export interface BackupScheduleSettings {
  enabled: boolean;
  frequency: BackupFrequency;
  run_time: string;
  weekday: number;
  retention_count: number;
  backup_directory: string;
  resolved_backup_directory?: string;
}

export interface BackupJob {
  id: number;
  job_type: "manual" | "scheduled" | "restore";
  status: "pending" | "running" | "success" | "failed";
  file_path: string;
  file_size_bytes: number;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: number | null;
  triggered_by_username: string | null;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface BackupDirectoryEntry {
  name: string;
  path: string;
}

export interface BackupDirectoryBrowseResponse {
  path: string;
  parent: string | null;
  directories: BackupDirectoryEntry[];
  drives: BackupDirectoryEntry[];
  quick_locations: BackupDirectoryEntry[];
}

export interface RolePermissionAssignment {
  module: string;
  actions: Array<"view" | "add" | "change" | "delete">;
}

export interface RoleWithPermissions {
  name: SettingsRoleName;
  permissions: RolePermissionAssignment[];
}

export interface ModuleActions {
  module: string;
  label: string;
  actions: string[];
}

export interface ActivityLogItem {
  id: number;
  action: string;
  table_name: string;
  record_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string;
  timestamp: string;
  user_name: string;
}
