import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { expenseFormSchema } from "../schemas/reportsSchemas";
import type { ExpenseFormValues } from "../types/reports";

const getToday = () => new Date().toISOString().slice(0, 10);

export type UseExpenseFormResult = UseFormReturn<ExpenseFormValues>;

export const useExpenseForm = (
  initialValues?: Partial<ExpenseFormValues>
): UseExpenseFormResult =>
  useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      expense_name: initialValues?.expense_name ?? "",
      amount: initialValues?.amount,
      expense_date: initialValues?.expense_date ?? getToday(),
      category: initialValues?.category ?? "other",
      transaction_type: initialValues?.transaction_type ?? "expense",
      note: initialValues?.note ?? "",
    },
  });
