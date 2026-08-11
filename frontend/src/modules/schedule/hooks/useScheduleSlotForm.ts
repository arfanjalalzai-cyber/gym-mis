import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { scheduleSlotFormSchema } from "../schemas/scheduleSchemas";
import type { ScheduleSlotFormValues } from "../types/schedule";

export type UseScheduleSlotFormResult = UseFormReturn<ScheduleSlotFormValues>;

export const useScheduleSlotForm = (
  initialValues?: Partial<ScheduleSlotFormValues>
): UseScheduleSlotFormResult => {
  return useForm<ScheduleSlotFormValues>({
    resolver: zodResolver(scheduleSlotFormSchema) as Resolver<ScheduleSlotFormValues>,
    defaultValues: {
      schedule_class: initialValues?.schedule_class ?? 0,
      trainer: initialValues?.trainer ?? 0,
      weekday: initialValues?.weekday ?? 0,
      start_time: initialValues?.start_time ?? "09:00:00",
      end_time: initialValues?.end_time ?? "10:00:00",
      effective_from: initialValues?.effective_from ?? "",
      effective_to: initialValues?.effective_to ?? "",
      notes: initialValues?.notes ?? "",
      is_active: initialValues?.is_active ?? true,
    },
  });
};
