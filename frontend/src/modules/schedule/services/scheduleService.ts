import apiClient from "@/lib/api";
import type {
  PaginatedScheduleClassesResponse,
  PaginatedScheduleSlotsResponse,
  ScheduleClass,
  ScheduleClassFormValues,
  ScheduleClassListParams,
  ScheduleSlot,
  ScheduleSlotFormValues,
  ScheduleSlotListParams,
  TrainerOption,
  WeeklyScheduleParams,
  WeeklyScheduleResponse,
} from "../types/schedule";

export const scheduleService = {
  getClassList: (params?: ScheduleClassListParams) =>
    apiClient.get<PaginatedScheduleClassesResponse>("/schedule/classes/", { params }),

  getClass: (id: number) => apiClient.get<ScheduleClass>(`/schedule/classes/${id}/`),

  createClass: (data: ScheduleClassFormValues) =>
    apiClient.post<ScheduleClass>("/schedule/classes/", data),

  updateClass: (id: number, data: Partial<ScheduleClassFormValues>) =>
    apiClient.patch<ScheduleClass>(`/schedule/classes/${id}/`, data),

  deleteClass: (id: number) => apiClient.delete(`/schedule/classes/${id}/`),

  getSlotList: (params?: ScheduleSlotListParams) =>
    apiClient.get<PaginatedScheduleSlotsResponse>("/schedule/slots/", { params }),

  getSlot: (id: number) => apiClient.get<ScheduleSlot>(`/schedule/slots/${id}/`),

  createSlot: (data: ScheduleSlotFormValues) =>
    apiClient.post<ScheduleSlot>("/schedule/slots/", data),

  updateSlot: (id: number, data: Partial<ScheduleSlotFormValues>) =>
    apiClient.patch<ScheduleSlot>(`/schedule/slots/${id}/`, data),

  deleteSlot: (id: number) => apiClient.delete(`/schedule/slots/${id}/`),

  getWeeklySchedule: (params?: WeeklyScheduleParams) =>
    apiClient.get<WeeklyScheduleResponse>("/schedule/slots/weekly/", { params }),

  getTrainerOptions: () => apiClient.get<TrainerOption[]>("/schedule/slots/trainers/"),
};
