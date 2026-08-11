import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { scheduleClassFormSchema } from "../schemas/scheduleSchemas";
import type { ScheduleClassFormValues } from "../types/schedule";

export type UseScheduleClassFormResult = UseFormReturn<ScheduleClassFormValues>;

export const useScheduleClassForm = (
  initialValues?: Partial<ScheduleClassFormValues>
): UseScheduleClassFormResult => {
  return useForm<ScheduleClassFormValues>({
    resolver: zodResolver(scheduleClassFormSchema) as Resolver<ScheduleClassFormValues>,
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      default_duration_minutes: initialValues?.default_duration_minutes ?? 60,
      max_capacity: initialValues?.max_capacity ?? undefined,
      is_active: initialValues?.is_active ?? true,
    },
  });
};
