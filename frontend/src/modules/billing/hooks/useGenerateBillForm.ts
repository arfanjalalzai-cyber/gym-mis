import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";

import { billGenerateSchema } from "../schemas/billingSchemas";
import type { BillGenerateFormValues } from "../types/billing";

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useGenerateBillForm = () =>
  useForm<BillGenerateFormValues>({
    resolver: zodResolver(billGenerateSchema) as Resolver<BillGenerateFormValues>,
    defaultValues: {
      member_id: 0,
      schedule_class_id: null,
      billing_date: getToday(),
      discount_amount: 0,
      original_fee_amount: 0,
    },
  });
