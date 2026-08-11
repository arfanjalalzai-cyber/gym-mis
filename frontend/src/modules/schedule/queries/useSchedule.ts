import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { scheduleService } from "../services/scheduleService";
import type {
  PaginatedScheduleClassesResponse,
  PaginatedScheduleSlotsResponse,
  ScheduleClass,
  ScheduleClassFormValues,
  ScheduleClassListParams,
  ScheduleConflictDiagnostic,
  ScheduleSlot,
  ScheduleSlotFormValues,
  ScheduleSlotListParams,
  TrainerOption,
  WeeklyScheduleParams,
  WeeklyScheduleResponse,
} from "../types/schedule";

type ScheduleErrorPayload = {
  detail?: string;
  conflicts?: ScheduleConflictDiagnostic[];
};

export const extractScheduleConflicts = (error: unknown): ScheduleConflictDiagnostic[] => {
  if (!axios.isAxiosError<ScheduleErrorPayload>(error)) return [];
  const conflicts = error.response?.data?.conflicts;
  return Array.isArray(conflicts) ? conflicts : [];
};

const extractScheduleErrorMessage = (error: unknown, fallback: string): string => {
  const conflicts = extractScheduleConflicts(error);
  if (conflicts.length > 0) {
    return `Schedule conflict detected (${conflicts.length}). Please resolve overlapping slots.`;
  }
  return extractAxiosError(error, fallback);
};

export const scheduleKeys = {
  all: ["schedule"] as const,
  classes: () => [...scheduleKeys.all, "classes"] as const,
  classList: (params?: ScheduleClassListParams) => [...scheduleKeys.classes(), "list", params] as const,
  classDetail: (id: number) => [...scheduleKeys.classes(), "detail", id] as const,
  slots: () => [...scheduleKeys.all, "slots"] as const,
  slotList: (params?: ScheduleSlotListParams) => [...scheduleKeys.slots(), "list", params] as const,
  slotDetail: (id: number) => [...scheduleKeys.slots(), "detail", id] as const,
  weekly: (params?: WeeklyScheduleParams) => [...scheduleKeys.slots(), "weekly", params] as const,
  trainers: () => [...scheduleKeys.slots(), "trainers"] as const,
};

export const useScheduleClassList = (params?: ScheduleClassListParams) =>
  useQuery<PaginatedScheduleClassesResponse>({
    queryKey: scheduleKeys.classList(params),
    queryFn: () => scheduleService.getClassList(params).then((res) => res.data),
  });

export const useScheduleClass = (id: number, options?: { enabled?: boolean }) =>
  useQuery<ScheduleClass>({
    queryKey: scheduleKeys.classDetail(id),
    queryFn: () => scheduleService.getClass(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useScheduleSlotList = (params?: ScheduleSlotListParams) =>
  useQuery<PaginatedScheduleSlotsResponse>({
    queryKey: scheduleKeys.slotList(params),
    queryFn: () => scheduleService.getSlotList(params).then((res) => res.data),
  });

export const useScheduleSlot = (id: number, options?: { enabled?: boolean }) =>
  useQuery<ScheduleSlot>({
    queryKey: scheduleKeys.slotDetail(id),
    queryFn: () => scheduleService.getSlot(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useWeeklySchedule = (params?: WeeklyScheduleParams, options?: { enabled?: boolean }) =>
  useQuery<WeeklyScheduleResponse>({
    queryKey: scheduleKeys.weekly(params),
    queryFn: () => scheduleService.getWeeklySchedule(params).then((res) => res.data),
    enabled: options?.enabled ?? true,
  });

export const useScheduleTrainers = () =>
  useQuery<TrainerOption[]>({
    queryKey: scheduleKeys.trainers(),
    queryFn: () => scheduleService.getTrainerOptions().then((res) => res.data),
  });

export const useCreateScheduleClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleClassFormValues) =>
      scheduleService.createClass(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Class created successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.classes() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create class"));
    },
  });
};

export const useUpdateScheduleClass = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScheduleClassFormValues>) =>
      scheduleService.updateClass(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Class updated successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.classes() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.classDetail(id) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slots() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update class"));
    },
  });
};

export const useDeleteScheduleClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteClass(id),
    onSuccess: () => {
      toast.success("Class deleted successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.classes() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slots() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete class"));
    },
  });
};

export const useCreateScheduleSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleSlotFormValues) =>
      scheduleService.createSlot(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Schedule slot created successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slots() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractScheduleErrorMessage(error, "Failed to create schedule slot"));
    },
  });
};

export const useUpdateScheduleSlot = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScheduleSlotFormValues>) =>
      scheduleService.updateSlot(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Schedule slot updated successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slots() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slotDetail(id) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractScheduleErrorMessage(error, "Failed to update schedule slot"));
    },
  });
};

export const useDeleteScheduleSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => scheduleService.deleteSlot(id),
    onSuccess: () => {
      toast.success("Schedule slot deleted successfully");
      queryClient.invalidateQueries({ queryKey: scheduleKeys.slots() });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.weekly() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete schedule slot"));
    },
  });
};
