import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalDate = z.string().trim().optional().or(z.literal(""));
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const requiredPositiveInt = z.preprocess((value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().int().positive("Must be greater than 0"));

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().int().positive("Must be greater than 0").optional());

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const scheduleClassFormSchema = z.object({
  name: z.string().trim().min(1, "Class name is required"),
  description: optionalText,
  default_duration_minutes: requiredPositiveInt,
  max_capacity: optionalPositiveInt,
  is_active: z.boolean(),
});

export const scheduleSlotFormSchema = z
  .object({
    schedule_class: requiredPositiveInt,
    trainer: requiredPositiveInt,
    weekday: z.preprocess((value) => Number(value), z.number().int().min(0).max(6)),
    start_time: z
      .string()
      .trim()
      .regex(timePattern, "Start time must be in HH:MM or HH:MM:SS format"),
    end_time: z
      .string()
      .trim()
      .regex(timePattern, "End time must be in HH:MM or HH:MM:SS format"),
    effective_from: optionalDate,
    effective_to: optionalDate,
    notes: optionalText,
    is_active: z.boolean(),
  })
  .refine((data) => toMinutes(data.end_time) > toMinutes(data.start_time), {
    message: "End time must be after start time.",
    path: ["end_time"],
  })
  .refine(
    (data) => {
      if (!data.effective_from || !data.effective_to) {
        return true;
      }
      return data.effective_to >= data.effective_from;
    },
    {
      message: "Effective end date cannot be before effective start date.",
      path: ["effective_to"],
    }
  );

export type ScheduleClassFormSchemaInput = z.infer<typeof scheduleClassFormSchema>;
export type ScheduleSlotFormSchemaInput = z.infer<typeof scheduleSlotFormSchema>;
