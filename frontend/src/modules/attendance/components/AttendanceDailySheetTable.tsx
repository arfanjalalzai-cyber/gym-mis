import { Edit3 } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import type { AttendanceDailySheetRow, AttendanceStatus } from "../types/attendance";

type AttendanceEntryStatus = AttendanceStatus | "unmarked";

interface AttendanceDailySheetTableProps {
  rows: AttendanceDailySheetRow[];
  entryState: Record<number, { staff_id: number; status: AttendanceEntryStatus }>;
  loading?: boolean;
  errorMessage?: string | null;
  selectedDate?: string;
  onStatusChange: (staffId: number, status: AttendanceEntryStatus) => void;
  onEditRecord: (row: AttendanceDailySheetRow) => void;
}

const statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
];

export default function AttendanceDailySheetTable({
  rows,
  entryState,
  loading = false,
  errorMessage = null,
  selectedDate,
  onStatusChange,
  onEditRecord,
}: AttendanceDailySheetTableProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h3 className="text-base font-semibold text-text-primary">Daily Attendance Sheet</h3>

        {loading ? (
          <div className="rounded-lg border border-border p-6 text-sm text-text-secondary">
            Loading attendance sheet...
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-error bg-error-soft p-6 text-sm text-error">
            {errorMessage}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-sm text-text-secondary">
            No staff found for {selectedDate ?? "selected date"}. This usually means no active/on-leave staff were hired by that date.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Staff</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Position</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const selectedStatus = entryState[row.staff_id]?.status ?? "unmarked";
                  const options = statusOptions.filter(
                    (option) =>
                      option.value !== "leave" ||
                      row.can_mark_leave ||
                      selectedStatus === "leave"
                  );

                  return (
                    <tr key={row.staff_id} className="border-t border-border">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-text-primary">{row.staff_name}</div>
                        <div className="text-xs text-text-secondary">{row.staff_code}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-text-secondary">{row.position}</td>
                      <td className="px-4 py-3">
                        <select
                          value={selectedStatus}
                          onChange={(event) =>
                            onStatusChange(
                              row.staff_id,
                              event.target.value as AttendanceEntryStatus
                            )
                          }
                          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {!row.is_recorded && (
                            <option value="unmarked">Not marked</option>
                          )}
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {row.leave_limit_message && selectedStatus !== "leave" && (
                          <p className="mt-1 text-xs text-error">{row.leave_limit_message}</p>
                        )}
                        {row.can_mark_leave && row.remaining_paid_leave_days > 0 && (
                          <p className="mt-1 text-xs text-text-secondary">
                            Paid leave left: {row.remaining_paid_leave_days}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit3 className="h-4 w-4" />}
                          onClick={() => onEditRecord(row)}
                          disabled={!row.record_id}
                        >
                          Edit Record
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
