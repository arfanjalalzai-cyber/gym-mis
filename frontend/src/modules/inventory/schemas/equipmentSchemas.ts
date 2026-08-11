import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

const requiredPositiveNumber = z.preprocess((value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().positive("Must be greater than 0"));

const requiredNonNegativeNumber = z.preprocess((value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().min(0, "Must be 0 or greater"));

export const equipmentFormSchema = z
  .object({
    name: z.string().trim().min(1, "Equipment name is required"),
    item_type: z.enum(["machine", "accessory", "consumable"]),
    category: z.enum([
      "cardio",
      "strength",
      "free_weight",
      "functional",
      "recovery",
      "hygiene",
      "nutrition",
      "other",
    ]),
    quantity_on_hand: requiredPositiveNumber,
    quantity_in_service: requiredNonNegativeNumber,
    machine_status: z
      .enum(["operational", "in_use", "maintenance", "out_of_order", "retired"])
      .optional()
      .or(z.literal("")),
    notes: optionalText,
  })
  .refine((data) => data.quantity_in_service <= data.quantity_on_hand, {
    message: "Quantity in service cannot exceed quantity on hand.",
    path: ["quantity_in_service"],
  })
  .refine(
    (data) => {
      if (data.item_type === "machine") {
        return Boolean(data.machine_status && String(data.machine_status).trim());
      }
      return !data.machine_status;
    },
    {
      message: "Machine status is required for machines and must be empty for non-machine items.",
      path: ["machine_status"],
    }
  );

export const quantityAdjustmentSchema = z.object({
  target: z.enum(["quantity_on_hand", "quantity_in_service"]),
  operation: z.enum(["increase", "decrease", "set"]),
  value: z.preprocess((value) => Number(value), z.number().int().min(0)),
  note: optionalText,
});

export type EquipmentFormSchemaInput = z.infer<typeof equipmentFormSchema>;
export type QuantityAdjustmentSchemaInput = z.infer<typeof quantityAdjustmentSchema>;
