import { useEffect, useState } from "react";

import { Button, Modal } from "@/components/ui";
import type { AttendanceDailySheetRow, AttendanceStatus } from "../types/attendance";

interface AttendanceRecordEditModalProps {
  isOpen: boolean;
  row: AttendanceDailySheetRow | null;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onSubmit: (payload: { id: number; status: AttendanceStatus }) => void;
  onDelete: (payload: { id: number; attendanceDate: string }) => void;
}

export default function AttendanceRecordEditModal({
  isOpen,
  row,
  isSubmitting = false,
  isDeleting = false,
  onClose,
  onSubmit,
  onDelete,
}: AttendanceRecordEditModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>("absent");

  useEffect(() => {
    if (!row) return;
    setStatus(row.status);
  }, [row]);

  if (!row) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Attendance Record"
      description={`${row.staff_name} (${row.staff_code})`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting || isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => onDelete({ id: row.record_id as number, attendanceDate: row.attendance_date })}
            loading={isDeleting}
            disabled={!row.record_id || isSubmitting}
          >
            Delete
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSubmit({
                id: row.record_id as number,
                status,
              })
            }
            loading={isSubmitting}
            disabled={!row.record_id || isDeleting}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Status</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            {(row.can_mark_leave || status === "leave") && <option value="leave">Leave</option>}
          </select>
          {row.leave_limit_message && status !== "leave" && (
            <p className="mt-1.5 text-xs text-error">{row.leave_limit_message}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
