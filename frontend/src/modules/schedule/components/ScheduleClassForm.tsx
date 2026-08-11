import { Button, Card, CardContent, Input } from "@/components/ui";
import { useScheduleClassForm } from "../hooks/useScheduleClassForm";
import type { ScheduleClassFormValues } from "../types/schedule";

interface ScheduleClassFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<ScheduleClassFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: ScheduleClassFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export default function ScheduleClassForm({
  mode,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ScheduleClassFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useScheduleClassForm(initialValues);

  const normalizePayload = (values: ScheduleClassFormValues): ScheduleClassFormValues => ({
    ...values,
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    max_capacity:
      values.max_capacity && Number(values.max_capacity) > 0
        ? Number(values.max_capacity)
        : undefined,
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(normalizePayload(values)))}>
      <Card>
        <CardContent className="space-y-4">
          <Input label="Class Name" error={errors.name?.message} {...register("name")} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="mt-1.5 text-sm text-error">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              min={1}
              label="Default Duration (minutes)"
              error={errors.default_duration_minutes?.message}
              {...register("default_duration_minutes", { valueAsNumber: true })}
            />

            <Input
              type="number"
              min={1}
              label="Max Capacity"
              error={errors.max_capacity?.message}
              {...register("max_capacity", { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                {...register("is_active")}
              />
              Active class
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Class" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
