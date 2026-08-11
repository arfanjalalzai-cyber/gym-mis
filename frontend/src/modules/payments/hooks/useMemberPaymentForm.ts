import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { memberPaymentSchema } from "../schemas/paymentSchemas";
import type { MemberPaymentFormValues } from "../types/payments";

const currentTimestamp = () => new Date().toISOString().slice(0, 16);

export type UseMemberPaymentFormResult = UseFormReturn<MemberPaymentFormValues>;

export const useMemberPaymentForm = (
  initialValues?: Partial<MemberPaymentFormValues>
): UseMemberPaymentFormResult =>
  useForm<MemberPaymentFormValues>({
    resolver: zodResolver(memberPaymentSchema) as Resolver<MemberPaymentFormValues>,
    defaultValues: {
      member_id: initialValues?.member_id ?? 0,
      cycle_id: initialValues?.cycle_id,
      amount_paid: initialValues?.amount_paid as number | undefined,
      discount_amount: initialValues?.discount_amount ?? 0,
      payment_method: initialValues?.payment_method ?? "cash",
      paid_at: initialValues?.paid_at ?? currentTimestamp(),
      note: initialValues?.note ?? "",
    },
  });
