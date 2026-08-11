import { z } from "zod";

const requiredId = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
  z
    .number({
      required_error: "Selection is required",
      invalid_type_error: "Selection is required",
    })
    .int()
    .positive("Selection is required")
);

const positiveAmount = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
  z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount is required",
    })
    .positive("Amount must be greater than 0")
);

const nonNegativeAmount = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
  z
    .number({
      invalid_type_error: "Discount amount is invalid",
    })
    .min(0, "Discount cannot be negative")
);

export const memberPaymentSchema = z.object({
  member_id: requiredId,
  cycle_id: z.number().int().positive().optional(),
  amount_paid: positiveAmount,
  discount_amount: nonNegativeAmount,
  payment_method: z.enum(["cash", "bank_transfer", "online", "card", "other"]),
  paid_at: z.string().trim().min(1, "Payment date is required"),
  note: z.string().trim().optional().or(z.literal("")),
});

export const salaryPaymentSchema = z.object({
  staff_id: requiredId,
  period_id: z.number().int().positive().optional(),
  amount_paid: positiveAmount,
  payment_method: z.enum(["cash", "bank_transfer", "online", "card", "other"]),
  paid_at: z.string().trim().min(1, "Payment date is required"),
  note: z.string().trim().optional().or(z.literal("")),
});

export const memberCycleUpsertSchema = z.object({
  member_id: requiredId,
  cycle_month: z.string().trim().min(1, "Cycle month is required"),
  cycle_discount_amount: nonNegativeAmount.optional(),
});

export const staffPeriodUpsertSchema = z.object({
  staff_id: requiredId,
  period_month: z.string().trim().min(1, "Period month is required"),
});

export type MemberPaymentSchemaInput = z.infer<typeof memberPaymentSchema>;
export type SalaryPaymentSchemaInput = z.infer<typeof salaryPaymentSchema>;
