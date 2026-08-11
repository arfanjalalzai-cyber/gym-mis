import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { attendanceService } from "../services/attendanceService";
import type {
  AttendanceBulkUpsertInput,
  AttendanceListParams,
  AttendanceMonthlyReportParams,
  AttendancePolicyUpdateInput,
} from "../types/attendance";

export const attendanceKeys = {
  all: ["attendance"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
  recordList: (params?: AttendanceListParams) =>
    [...attendanceKeys.records(), "list", params] as const,
  dailySheet: (date: string) => [...attendanceKeys.records(), "daily-sheet", date] as const,
  reports: () => [...attendanceKeys.all, "reports"] as const,
  monthlyReport: (params?: AttendanceMonthlyReportParams) =>
    [...attendanceKeys.reports(), "monthly", params] as const,
  policy: () => [...attendanceKeys.all, "policy"] as const,
};

export const useAttendanceRecords = (params?: AttendanceListParams, enabled = true) =>
  useQuery({
    queryKey: attendanceKeys.recordList(params),
    queryFn: () => attendanceService.getAttendanceRecords(params).then((res) => res.data),
    enabled,
  });

export const useAttendanceDailySheet = (date: string, enabled = true) =>
  useQuery({
    queryKey: attendanceKeys.dailySheet(date),
    queryFn: () => attendanceService.getDailySheet(date).then((res) => res.data),
    enabled: Boolean(date) && enabled,
  });

export const useBulkUpsertAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendanceBulkUpsertInput) =>
      attendanceService.bulkUpsertDailyAttendance(data).then((res) => res.data),
    onSuccess: (_, variables) => {
      toast.success("Attendance saved successfully");
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.dailySheet(variables.attendance_date) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ["payments", "staff-periods"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to save attendance"));
    },
  });
};

export const useUpdateAttendanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        status: "present" | "absent" | "late" | "leave";
        note: string;
        attendance_date: string;
        staff: number;
      }>;
    }) => attendanceService.updateAttendanceRecord(id, data).then((res) => res.data),
    onSuccess: (updated) => {
      toast.success("Attendance record updated");
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.dailySheet(updated.attendance_date) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ["payments", "staff-periods"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update attendance record"));
    },
  });
};

export const useDeleteAttendanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attendanceDate }: { id: number; attendanceDate: string }) =>
      attendanceService.deleteAttendanceRecord(id).then(() => ({ attendanceDate })),
    onSuccess: ({ attendanceDate }) => {
      toast.success("Attendance record deleted");
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.dailySheet(attendanceDate) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ["payments", "staff-periods"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete attendance record"));
    },
  });
};

export const useAttendanceMonthlyReport = (
  params?: AttendanceMonthlyReportParams,
  enabled = true
) =>
  useQuery({
    queryKey: attendanceKeys.monthlyReport(params),
    queryFn: () => attendanceService.getMonthlyReport(params).then((res) => res.data),
    enabled,
  });

export const useAttendancePolicy = () =>
  useQuery({
    queryKey: attendanceKeys.policy(),
    queryFn: () => attendanceService.getPolicy().then((res) => res.data),
  });

export const useUpdateAttendancePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttendancePolicyUpdateInput) =>
      attendanceService.updatePolicy(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Attendance policy updated");
      queryClient.invalidateQueries({ queryKey: attendanceKeys.policy() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ["payments", "staff-periods"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update attendance policy"));
    },
  });
};
