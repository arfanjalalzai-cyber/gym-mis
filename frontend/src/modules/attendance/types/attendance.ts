export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRecord {
  id: number;
  staff: number;
  staff_code: string;
  staff_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: number | null;
  marked_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceListParams {
  page?: number;
  page_size?: number;
  date?: string;
  date_from?: string;
  date_to?: string;
  staff_id?: number;
  status?: AttendanceStatus;
  search?: string;
  ordering?: "attendance_date" | "-attendance_date" | "created_at" | "-created_at";
}

export interface PaginatedAttendanceRecordsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceRecord[];
}

export interface AttendanceDailySheetRow {
  record_id: number | null;
  staff_id: number;
  staff_code: string;
  staff_name: string;
  position: string;
  attendance_date: string;
  is_recorded: boolean;
  status: AttendanceStatus;
  note: string | null;
  marked_by: number | null;
  marked_by_username: string | null;
  updated_at: string | null;
  monthly_paid_leave_days: number;
  leave_days_used: number;
  remaining_paid_leave_days: number;
  can_mark_leave: boolean;
  leave_limit_message: string | null;
}

export interface AttendanceDailySheetResponse {
  attendance_date: string;
  count: number;
  results: AttendanceDailySheetRow[];
}

export interface AttendanceBulkEntry {
  staff_id: number;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceBulkUpsertInput {
  attendance_date: string;
  entries: AttendanceBulkEntry[];
}

export interface AttendancePolicy {
  id: number;
  block_future_dates: boolean;
  late_deduction_enabled: boolean;
  late_deduction_fraction: string;
  absent_deduction_fraction: string;
  leave_is_paid: boolean;
  monthly_paid_leave_days: number;
  missing_as_absent: boolean;
  salary_basis: "calendar_days";
  created_at: string;
  updated_at: string;
}

export interface AttendancePolicyUpdateInput {
  block_future_dates?: boolean;
  late_deduction_enabled?: boolean;
  late_deduction_fraction?: number;
  absent_deduction_fraction?: number;
  leave_is_paid?: boolean;
  monthly_paid_leave_days?: number;
  missing_as_absent?: boolean;
}

export interface AttendanceMonthlyReportParams {
  month?: string;
  staff_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AttendanceMonthlyReportRow {
  staff_id: number;
  staff_code: string;
  staff_name: string;
  position: string;
  month: string;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  missing_days: number;
  base_salary: string;
  payable_salary: string;
  deduction_amount: string;
  currency: string;
}

export interface PaginatedAttendanceMonthlyReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceMonthlyReportRow[];
}
