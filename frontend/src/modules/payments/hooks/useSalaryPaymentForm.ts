import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { salaryPaymentSchema } from "../schemas/paymentSchemas";
import type { SalaryPaymentFormValues } from "../types/payments";

const currentTimestamp = () => new Date().toISOString().slice(0, 16);

export type UseSalaryPaymentFormResult = UseFormReturn<SalaryPaymentFormValues>;

export const useSalaryPaymentForm = (
  initialValues?: Partial<SalaryPaymentFormValues>
): UseSalaryPaymentFormResult =>
  useForm<SalaryPaymentFormValues>({
    resolver: zodResolver(salaryPaymentSchema) as Resolver<SalaryPaymentFormValues>,
    defaultValues: {
      staff_id: initialValues?.staff_id ?? 0,
      period_id: initialValues?.period_id,
      amount_paid: initialValues?.amount_paid as number | undefined,
      payment_method: initialValues?.payment_method ?? "cash",
      paid_at: initialValues?.paid_at ?? currentTimestamp(),
      note: initialValues?.note ?? "",
    },
  });
