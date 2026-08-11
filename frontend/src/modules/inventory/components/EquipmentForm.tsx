import { Button, Card, CardContent, Input } from "@/components/ui";
import { useEquipmentForm } from "../hooks/useEquipmentForm";
import type { EquipmentFormValues } from "../types/equipment";

interface EquipmentFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<EquipmentFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: EquipmentFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

export default function EquipmentForm({
  mode,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: EquipmentFormProps) {
  const {
    register,
    handleSubmit,
    isMachine,
    formState: { errors },
  } = useEquipmentForm(initialValues);

  const normalizePayload = (values: EquipmentFormValues): EquipmentFormValues => {
    const payload: EquipmentFormValues = {
      ...values,
      machine_status: values.machine_status || undefined,
      notes: values.notes?.trim() || undefined,
    };

    if (payload.item_type !== "machine") {
      payload.machine_status = undefined;
    }

    return payload;
  };

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(normalizePayload(values)))}>
      <Card>
        <CardContent className="space-y-5">
          <Input label="Equipment Name" error={errors.name?.message} {...register("name")} />

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Item Type</label>
              <select
                {...register("item_type")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="machine">Machine</option>
                <option value="accessory">Accessory</option>
                <option value="consumable">Consumable</option>
              </select>
              {errors.item_type?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.item_type.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Category</label>
              <select
                {...register("category")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="cardio">Cardio</option>
                <option value="strength">Strength</option>
                <option value="free_weight">Free Weight</option>
                <option value="functional">Functional</option>
                <option value="recovery">Recovery</option>
                <option value="hygiene">Hygiene</option>
                <option value="nutrition">Nutrition</option>
                <option value="other">Other</option>
              </select>
              {errors.category?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.category.message}</p>
              )}
            </div>

            {isMachine && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Machine Status
                </label>
                <select
                  {...register("machine_status")}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select status</option>
                  <option value="operational">Operational</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                  <option value="retired">Retired</option>
                </select>
                {errors.machine_status?.message && (
                  <p className="mt-1.5 text-sm text-error">{errors.machine_status.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              min={1}
              label="Quantity On Hand"
              error={errors.quantity_on_hand?.message}
              {...register("quantity_on_hand", { valueAsNumber: true })}
            />
            <Input
              type="number"
              min={0}
              label="Quantity In Service"
              error={errors.quantity_in_service?.message}
              {...register("quantity_in_service", { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="mt-1.5 text-sm text-error">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Equipment" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
