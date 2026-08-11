import { z } from "zod";

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "leave"]);

export const attendanceRecordUpdateSchema = z.object({
  status: attendanceStatusSchema,
  note: z.string().max(1000).optional().or(z.literal("")),
});

export const attendancePolicySchema = z.object({
  block_future_dates: z.boolean(),
  late_deduction_enabled: z.boolean(),
  late_deduction_fraction: z.number().min(0).max(1),
  absent_deduction_fraction: z.number().min(0).max(1),
  leave_is_paid: z.boolean(),
  monthly_paid_leave_days: z.number().int().min(0).max(31),
  missing_as_absent: z.boolean(),
});
