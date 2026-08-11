import { Button, Card, CardContent, Input } from "@/components/ui";
import { useScheduleSlotForm } from "../hooks/useScheduleSlotForm";
import type {
  ScheduleClassListItem,
  ScheduleSlotFormValues,
  TrainerOption,
  Weekday,
} from "../types/schedule";

interface ScheduleSlotFormProps {
  mode: "create" | "edit";
  classOptions: ScheduleClassListItem[];
  trainerOptions: TrainerOption[];
  initialValues?: Partial<ScheduleSlotFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: ScheduleSlotFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const weekdays: Array<{ value: Weekday; label: string }> = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const normalizeTime = (value: string) => (value.length === 5 ? `${value}:00` : value);

export default function ScheduleSlotForm({
  mode,
  classOptions,
  trainerOptions,
  initialValues,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ScheduleSlotFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useScheduleSlotForm(initialValues);

  const normalizePayload = (values: ScheduleSlotFormValues): ScheduleSlotFormValues => ({
    ...values,
    schedule_class: Number(values.schedule_class),
    trainer: Number(values.trainer),
    weekday: Number(values.weekday) as Weekday,
    start_time: normalizeTime(values.start_time.trim()),
    end_time: normalizeTime(values.end_time.trim()),
    effective_from: values.effective_from?.trim() || undefined,
    effective_to: values.effective_to?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(normalizePayload(values)))}>
      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Class
              </label>
              <select
                {...register("schedule_class", { valueAsNumber: true })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select class</option>
                {classOptions.map((scheduleClass) => (
                  <option key={scheduleClass.id} value={scheduleClass.id}>
                    {scheduleClass.name} ({scheduleClass.class_code})
                  </option>
                ))}
              </select>
              {errors.schedule_class?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.schedule_class.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Trainer
              </label>
              <select
                {...register("trainer", { valueAsNumber: true })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select trainer</option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.trainer_name} ({trainer.trainer_code})
                  </option>
                ))}
              </select>
              {errors.trainer?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.trainer.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Weekday
              </label>
              <select
                {...register("weekday", { valueAsNumber: true })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {weekdays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
              {errors.weekday?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.weekday.message}</p>
              )}
            </div>

            <Input
              type="time"
              step={60}
              label="Start Time"
              error={errors.start_time?.message}
              {...register("start_time")}
            />

            <Input
              type="time"
              step={60}
              label="End Time"
              error={errors.end_time?.message}
              {...register("end_time")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Effective From"
              error={errors.effective_from?.message}
              {...register("effective_from")}
            />

            <Input
              type="date"
              label="Effective To"
              error={errors.effective_to?.message}
              {...register("effective_to")}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="mt-1.5 text-sm text-error">{errors.notes.message}</p>
            )}
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                {...register("is_active")}
              />
              Active slot
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Slot" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
