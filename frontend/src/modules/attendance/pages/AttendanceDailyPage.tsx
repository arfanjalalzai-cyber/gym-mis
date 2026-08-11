import { useState } from "react";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button } from "@/components/ui";
import { extractAxiosError } from "@/utils/extractError";
import AttendanceDailySheetTable from "../components/AttendanceDailySheetTable";
import AttendanceDateToolbar from "../components/AttendanceDateToolbar";
import AttendancePolicyCard from "../components/AttendancePolicyCard";
import AttendanceRecordEditModal from "../components/AttendanceRecordEditModal";
import { useAttendanceDailySheetForm } from "../hooks/useAttendanceDailySheetForm";
import { useAttendanceFilters } from "../hooks/useAttendanceFilters";
import {
  useAttendanceDailySheet,
  useBulkUpsertAttendance,
  useDeleteAttendanceRecord,
  useUpdateAttendanceRecord,
} from "../queries/useAttendance";
import type { AttendanceDailySheetRow } from "../types/attendance";

export default function AttendanceDailyPage() {
  const navigate = useNavigate();
  const { selectedDate, updateDate } = useAttendanceFilters();
  const dailySheetQuery = useAttendanceDailySheet(selectedDate);
  const dailySheet = dailySheetQuery.data;
  const isLoading = dailySheetQuery.isLoading;
  const dailySheetErrorMessage = dailySheetQuery.error
    ? extractAxiosError(dailySheetQuery.error, "Failed to load daily attendance sheet.")
    : null;
  const rows = dailySheet?.results ?? [];
  const { entryState, entries, updateStatus } = useAttendanceDailySheetForm(
    rows,
    selectedDate
  );

  const bulkUpsert = useBulkUpsertAttendance();
  const updateRecord = useUpdateAttendanceRecord();
  const deleteRecord = useDeleteAttendanceRecord();

  const [editingRow, setEditingRow] = useState<AttendanceDailySheetRow | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark and manage daily staff attendance."
      />

      <AttendanceDateToolbar
        selectedDate={selectedDate}
        onDateChange={updateDate}
        onOpenReport={() => navigate("/attendance/report")}
      />

      <AttendanceDailySheetTable
        rows={rows}
        entryState={entryState}
        loading={isLoading}
        errorMessage={dailySheetErrorMessage}
        selectedDate={selectedDate}
        onStatusChange={updateStatus}
        onEditRecord={(row) => setEditingRow(row)}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          leftIcon={<Save className="h-4 w-4" />}
          loading={bulkUpsert.isPending}
          onClick={() =>
            bulkUpsert.mutate({
              attendance_date: selectedDate,
              entries,
            })
          }
        >
          Save Daily Attendance
        </Button>
      </div>

      <AttendancePolicyCard />

      <AttendanceRecordEditModal
        isOpen={Boolean(editingRow)}
        row={editingRow}
        isSubmitting={updateRecord.isPending}
        isDeleting={deleteRecord.isPending}
        onClose={() => setEditingRow(null)}
        onSubmit={(payload) => {
          updateRecord.mutate(
            {
              id: payload.id,
              data: {
                status: payload.status,
              },
            },
            {
              onSuccess: () => setEditingRow(null),
            }
          );
        }}
        onDelete={(payload) => {
          deleteRecord.mutate(payload, {
            onSuccess: () => setEditingRow(null),
          });
        }}
      />
    </div>
  );
}
