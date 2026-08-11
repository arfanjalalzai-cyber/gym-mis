import { z } from "zod";

const afghanMobilePattern = /^07\d{8}$/;

export const gymProfileSchema = z.object({
  gym_name: z.string().trim().min(2, "Gym name is required"),
  address: z.string().trim().min(3, "Address is required"),
  phone_number: z
    .string()
    .trim()
    .regex(afghanMobilePattern, "Phone number must be exactly 10 digits and start with 07"),
  email: z.string().trim().email("Valid email is required"),
  website: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional(),
});

export const settingsUserCreateSchema = z.object({
  first_name: z.string().trim().min(2, "First name is required"),
  last_name: z.string().trim().min(2, "Last name is required"),
  username: z.string().trim().min(3, "Username is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || afghanMobilePattern.test(value),
      "Phone number must be exactly 10 digits and start with 07"
    )
    .optional(),
  role_name: z.enum(["admin", "manager", "staff"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required"),
  duration_type: z.enum(["monthly", "quarterly", "yearly"]),
  duration_months: z.number().int().positive(),
  fee: z.string().refine((value) => Number(value) > 0, "Fee must be greater than 0"),
  description: z.string().optional(),
});

export const billingSettingsSchema = z.object({
  default_currency: z.literal("AFN"),
  payment_methods_json: z.array(z.enum(["cash", "bank_transfer", "online"])).min(1),
  default_tax_percentage: z.string().optional().nullable(),
  discount_mode: z.enum(["none", "percentage", "fixed"]),
  discount_value: z.string().refine((value) => Number(value) >= 0, "Discount cannot be negative"),
  invoice_prefix: z.string().trim().min(1),
  invoice_padding: z.number().int().min(1).max(12),
  invoice_next_sequence: z.number().int().min(1),
});

export const notificationSettingsSchema = z.object({
  membership_expiry_alert_enabled: z.boolean(),
  membership_expiry_days_before: z.number().int().min(1).max(365),
  payment_due_reminder_enabled: z.boolean(),
  payment_due_days_before: z.number().int().min(1).max(365),
  sms_enabled: z.boolean(),
  sms_provider: z.string().optional(),
  sms_sender_id: z.string().optional(),
  sms_api_key: z.string().optional(),
  email_enabled: z.boolean(),
  smtp_host: z.string().optional(),
  smtp_port: z.number().int().min(1).max(65535),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  from_email: z.string().email().or(z.literal("")),
});

export const securitySettingsSchema = z.object({
  min_password_length: z.number().int().min(6).max(128),
  require_uppercase: z.boolean(),
  require_lowercase: z.boolean(),
  require_number: z.boolean(),
  require_special: z.boolean(),
  two_factor_enabled: z.boolean(),
  login_attempt_limit: z.number().int().min(1).max(20),
  lockout_minutes: z.number().int().min(1).max(1440),
});

export const systemPreferenceSettingsSchema = z.object({
  calendar_system: z.enum(["gregorian", "hijri_shamsi", "hijri_qamari"]),
  date_format: z.string().trim().min(2),
  time_format: z.string().trim().min(2),
  timezone: z.string().trim().min(2),
});

export const backupScheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  run_time: z.string().trim().min(4),
  weekday: z.number().int().min(0).max(6),
  retention_count: z.number().int().min(1).max(365),
  backup_directory: z.string().trim().optional(),
});
