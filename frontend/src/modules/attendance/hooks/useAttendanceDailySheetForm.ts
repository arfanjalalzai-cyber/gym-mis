import { useEffect, useMemo, useState } from "react";

import type {
  AttendanceBulkEntry,
  AttendanceDailySheetRow,
  AttendanceStatus,
} from "../types/attendance";

type AttendanceEntryStatus = AttendanceStatus | "unmarked";
type EntryState = Record<number, { staff_id: number; status: AttendanceEntryStatus }>;

const rowsToEntryState = (rows: AttendanceDailySheetRow[]): EntryState => {
  const next: EntryState = {};
  for (const row of rows) {
    next[row.staff_id] = {
      staff_id: row.staff_id,
      status: row.is_recorded ? row.status : "unmarked",
    };
  }
  return next;
};

export const useAttendanceDailySheetForm = (
  rows: AttendanceDailySheetRow[],
  attendanceDate: string
) => {
  const [entryState, setEntryState] = useState<EntryState>(() => rowsToEntryState(rows));

  useEffect(() => {
    setEntryState(rowsToEntryState(rows));
  }, [rows, attendanceDate]);

  const updateStatus = (staffId: number, status: AttendanceEntryStatus) => {
    setEntryState((prev) => ({
      ...prev,
      [staffId]: {
        staff_id: staffId,
        status,
      },
    }));
  };

  const entries = useMemo(
    () =>
      Object.values(entryState)
        .filter((entry): entry is AttendanceBulkEntry => entry.status !== "unmarked")
        .map((entry) => ({
          staff_id: entry.staff_id,
          status: entry.status,
        })),
    [entryState]
  );

  return {
    entryState,
    entries,
    updateStatus,
  };
};
