import { z } from "zod";

export const billGenerateSchema = z
  .object({
    member_id: z.number().int().positive("Member is required."),
    schedule_class_id: z.number().int().positive().nullable(),
    billing_date: z.string().min(1, "Billing date is required."),
    discount_amount: z
      .number({ invalid_type_error: "Discount is required." })
      .min(0, "Discount cannot be negative."),
    original_fee_amount: z
      .number({ invalid_type_error: "Original fee is required." })
      .min(0, "Original fee cannot be negative."),
  })
  .superRefine((values, ctx) => {
    if (values.discount_amount > values.original_fee_amount) {
      ctx.addIssue({
        code: "custom",
        path: ["discount_amount"],
        message: "Discount cannot exceed original fee.",
      });
    }
  });

export type BillGenerateSchemaInput = z.infer<typeof billGenerateSchema>;
