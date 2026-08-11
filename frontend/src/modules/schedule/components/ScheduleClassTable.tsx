import { Button } from "@/components/ui";
import type { ScheduleClassListItem } from "../types/schedule";

interface ScheduleClassTableProps {
  classes: ScheduleClassListItem[];
  loading?: boolean;
  onEdit: (scheduleClass: ScheduleClassListItem) => void;
}

export default function ScheduleClassTable({
  classes,
  loading = false,
  onEdit,
}: ScheduleClassTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-text-secondary">
        Loading classes...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[700px]">
        <thead className="bg-surface">
          <tr className="border-b border-border text-left text-sm text-text-primary">
            <th className="px-4 py-3 font-semibold">Code</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Duration</th>
            <th className="px-4 py-3 font-semibold">Capacity</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                No classes found.
              </td>
            </tr>
          ) : (
            classes.map((scheduleClass) => (
              <tr
                key={scheduleClass.id}
                className="border-b border-border text-sm text-text-primary last:border-0"
              >
                <td className="px-4 py-3">{scheduleClass.class_code}</td>
                <td className="px-4 py-3">{scheduleClass.name}</td>
                <td className="px-4 py-3">{scheduleClass.default_duration_minutes} min</td>
                <td className="px-4 py-3">{scheduleClass.max_capacity ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      scheduleClass.is_active
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {scheduleClass.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(scheduleClass)}>
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
