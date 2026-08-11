import { z } from "zod";

export const cardRegenerateSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Reason cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export const cardLookupSchema = z.object({
  card_id: z
    .string()
    .trim()
    .min(1, "Card ID is required.")
    .max(30, "Card ID is too long."),
});

export type CardRegenerateSchemaInput = z.infer<typeof cardRegenerateSchema>;
export type CardLookupSchemaInput = z.infer<typeof cardLookupSchema>;

