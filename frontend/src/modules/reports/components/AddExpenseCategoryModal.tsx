import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";

import { Button, Input, Modal } from "@/components/ui";
import { expenseCategoryFormSchema } from "../schemas/reportsSchemas";
import type { ExpenseCategoryCreateInput } from "../types/reports";

interface AddExpenseCategoryModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseCategoryCreateInput) => Promise<void> | void;
}

export default function AddExpenseCategoryModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: AddExpenseCategoryModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseCategoryCreateInput>({
    resolver: zodResolver(expenseCategoryFormSchema) as Resolver<ExpenseCategoryCreateInput>,
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ name: "" });
    }
  }, [isOpen, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
    });
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense Category"
      description="Create a category for gym expense reports."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={isSubmitting}>
            Save Category
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label="Category Name"
          placeholder="Enter category name"
          error={errors.name?.message}
          {...register("name")}
        />
      </form>
    </Modal>
  );
}
