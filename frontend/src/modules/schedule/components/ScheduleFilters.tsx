import type {
  ScheduleClassListItem,
  TrainerOption,
} from "../types/schedule";

interface ScheduleFiltersProps {
  weekStart: string;
  trainerId: number | null;
  classId: number | null;
  trainerOptions: TrainerOption[];
  classOptions: ScheduleClassListItem[];
  onWeekStartChange: (value: string) => void;
  onTrainerChange: (value: number | null) => void;
  onClassChange: (value: number | null) => void;
}

export default function ScheduleFilters({
  weekStart,
  trainerId,
  classId,
  trainerOptions,
  classOptions,
  onWeekStartChange,
  onTrainerChange,
  onClassChange,
}: ScheduleFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Week Start (Monday)
          </label>
          <input
            type="date"
            value={weekStart}
            onChange={(event) => onWeekStartChange(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Trainer
          </label>
          <select
            value={trainerId ?? ""}
            onChange={(event) =>
              onTrainerChange(event.target.value ? Number(event.target.value) : null)
            }
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Trainers</option>
            {trainerOptions.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.trainer_name} ({trainer.trainer_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Class
          </label>
          <select
            value={classId ?? ""}
            onChange={(event) =>
              onClassChange(event.target.value ? Number(event.target.value) : null)
            }
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Classes</option>
            {classOptions.map((scheduleClass) => (
              <option key={scheduleClass.id} value={scheduleClass.id}>
                {scheduleClass.name} ({scheduleClass.class_code})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
