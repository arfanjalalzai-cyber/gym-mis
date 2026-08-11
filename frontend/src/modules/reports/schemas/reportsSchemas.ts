import { z } from "zod";

export const expenseCategoryValues = [
  "rent",
  "utilities",
  "salary",
  "equipment",
  "maintenance",
  "marketing",
  "other",
] as const;

export const expenseFormSchema = z.object({
  expense_name: z
    .string()
    .trim()
    .min(2, "Expense name must be at least 2 characters."),
  amount: z
    .number({
      invalid_type_error: "Amount is required.",
    })
    .positive("Amount must be greater than 0."),
  expense_date: z.string().min(1, "Expense date is required."),
  category: z.string().min(1, "Category is required."),
  transaction_type: z.enum(["expense", "return"]).default("expense"),
  note: z.string().max(1000, "Note is too long.").optional(),
});

export const expenseCategoryFormSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters."),
});
