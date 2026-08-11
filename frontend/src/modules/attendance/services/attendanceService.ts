import apiClient from "@/lib/api";
import type {
  AttendanceBulkUpsertInput,
  AttendanceDailySheetResponse,
  AttendanceListParams,
  AttendanceMonthlyReportParams,
  AttendancePolicy,
  AttendancePolicyUpdateInput,
  AttendanceRecord,
  PaginatedAttendanceMonthlyReportResponse,
  PaginatedAttendanceRecordsResponse,
} from "../types/attendance";

export const attendanceService = {
  getAttendanceRecords: (params?: AttendanceListParams) =>
    apiClient.get<PaginatedAttendanceRecordsResponse>("/attendance/records/", { params }),

  createAttendanceRecord: (data: {
    staff: number;
    attendance_date: string;
    status: "present" | "absent" | "late" | "leave";
    note?: string;
  }) => apiClient.post<AttendanceRecord>("/attendance/records/", data),

  updateAttendanceRecord: (
    id: number,
    data: Partial<{
      staff: number;
      attendance_date: string;
      status: "present" | "absent" | "late" | "leave";
      note: string;
    }>
  ) => apiClient.patch<AttendanceRecord>(`/attendance/records/${id}/`, data),

  deleteAttendanceRecord: (id: number) =>
    apiClient.delete(`/attendance/records/${id}/`),

  getDailySheet: (attendanceDate: string) =>
    apiClient.get<AttendanceDailySheetResponse>("/attendance/records/daily-sheet/", {
      params: { date: attendanceDate },
    }),

  bulkUpsertDailyAttendance: (data: AttendanceBulkUpsertInput) =>
    apiClient.post<AttendanceDailySheetResponse>("/attendance/records/bulk-upsert/", data),

  getMonthlyReport: (params?: AttendanceMonthlyReportParams) =>
    apiClient.get<PaginatedAttendanceMonthlyReportResponse>(
      "/attendance/reports/monthly/",
      { params }
    ),

  getPolicy: () => apiClient.get<AttendancePolicy>("/attendance/policy/"),

  updatePolicy: (data: AttendancePolicyUpdateInput) =>
    apiClient.patch<AttendancePolicy>("/attendance/policy/", data),
};

