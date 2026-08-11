import type { ScheduleConflictDiagnostic } from "../types/schedule";

interface ConflictDiagnosticsAlertProps {
  conflicts: ScheduleConflictDiagnostic[];
}

const weekdayLabels: Record<number, string> = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
};

const reasonLabels: Record<ScheduleConflictDiagnostic["reason"], string> = {
  trainer_overlap: "Trainer overlap",
  class_overlap: "Class overlap",
};

export default function ConflictDiagnosticsAlert({
  conflicts,
}: ConflictDiagnosticsAlertProps) {
  if (!conflicts.length) return null;

  return (
    <div className="rounded-xl border border-error/50 bg-error/5 p-4">
      <h3 className="text-sm font-semibold text-error">Schedule conflicts detected</h3>
      <p className="mt-1 text-sm text-text-secondary">
        Resolve the following conflicts before saving this slot.
      </p>
      <ul className="mt-3 space-y-2">
        {conflicts.map((conflict) => (
          <li
            key={`${conflict.slot_id}-${conflict.reason}`}
            className="rounded-lg border border-error/30 bg-white/40 px-3 py-2 text-sm"
          >
            <span className="font-medium text-text-primary">
              {reasonLabels[conflict.reason]}
            </span>{" "}
            on {weekdayLabels[conflict.weekday]} ({conflict.start_time} - {conflict.end_time})
            <div className="text-text-secondary">
              Class: {conflict.class_name} | Trainer: {conflict.trainer_name}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
