import { useEffect, useState } from "react";

import { Button, Input, Modal, SearchableSelect, Textarea } from "@/components/ui";
import { useExpenseForm } from "../hooks/useExpenseForm";
import type {
  ExpenseCategoryItem,
  ExpenseFormValues,
  ExpenseNameOption,
  ExpenseTransactionType,
} from "../types/reports";

interface AddExpenseModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  categories: ExpenseCategoryItem[];
  title?: string;
  description?: string;
  submitLabel?: string;
  transactionType?: ExpenseTransactionType;
  expenseNameOptions?: ExpenseNameOption[];
  initialValues?: Partial<ExpenseFormValues>;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void> | void;
}

const getToday = () => new Date().toISOString().slice(0, 10);

export default function AddExpenseModal({
  isOpen,
  isSubmitting = false,
  categories,
  title = "Add Expense",
  description = "Record a new gym expense for reporting.",
  submitLabel = "Save Expense",
  transactionType = "expense",
  expenseNameOptions = [],
  initialValues,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useExpenseForm({
    expense_date: getToday(),
    category: "other",
  });
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(null);
  const isReturn = transactionType === "return";
  const selectedCategory = watch("category");

  useEffect(() => {
    if (!isOpen) return;
    const matchingExpense = expenseNameOptions.find(
      (option) =>
        option.expense_name === initialValues?.expense_name &&
        option.category === initialValues?.category
    );
    setSelectedExpenseId(matchingExpense?.id ?? null);
    reset({
      expense_name: initialValues?.expense_name ?? "",
      amount: initialValues?.amount,
      expense_date: initialValues?.expense_date ?? getToday(),
      category: initialValues?.category ?? "other",
      transaction_type: initialValues?.transaction_type ?? transactionType,
      note: initialValues?.note ?? "",
    });
  }, [expenseNameOptions, initialValues, isOpen, reset, transactionType]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      transaction_type: initialValues?.transaction_type ?? transactionType,
      note: values.note?.trim() || undefined,
    });
    onClose();
  });

  const categoryOptions =
    categories.length > 0
      ? categories
      : [{ id: 0, name: "Other", slug: "other", is_active: true, created_at: "", updated_at: "" }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={isSubmitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        {isReturn ? (
          <SearchableSelect
            label="Expense Name"
            placeholder="Select expense name"
            searchPlaceholder="Search expense name..."
            emptyMessage="No matching expenses found."
            options={expenseNameOptions}
            value={selectedExpenseId}
            error={errors.expense_name?.message}
            onChange={(value) => {
              setSelectedExpenseId(value);
              const selectedExpense = expenseNameOptions.find((option) => option.id === value);
              setValue("expense_name", selectedExpense?.expense_name ?? "", {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (selectedExpense?.category) {
                setValue("category", selectedExpense.category, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
          />
        ) : (
          <Input
            label="Expense Name"
            placeholder="Enter expense name"
            error={errors.expense_name?.message}
            {...register("expense_name")}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Amount (AFN)"
            type="number"
            min="0.01"
            step="0.01"
            error={errors.amount?.message}
            {...register("amount", { valueAsNumber: true })}
          />
          <Input
            label="Expense Date"
            type="date"
            error={errors.expense_date?.message}
            {...register("expense_date")}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Category</label>
          <select
            {...register("category")}
            value={selectedCategory}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {categoryOptions.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category?.message ? (
            <p className="mt-1.5 text-sm text-error">{errors.category.message}</p>
          ) : null}
        </div>
        <Textarea
          label="Note (Optional)"
          rows={3}
          error={errors.note?.message}
          {...register("note")}
        />
      </form>
    </Modal>
  );
}
