import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { staffService } from "../services/staffService";
import type {
  PaginatedStaffResponse,
  Staff,
  StaffFormValues,
  StaffListParams,
} from "../types/staff";

export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (params?: StaffListParams) => [...staffKeys.lists(), params] as const,
  details: () => [...staffKeys.all, "detail"] as const,
  detail: (id: number) => [...staffKeys.details(), id] as const,
};

export const useStaffList = (params?: StaffListParams, options?: { enabled?: boolean }) =>
  useQuery<PaginatedStaffResponse>({
    queryKey: staffKeys.list(params),
    queryFn: () => staffService.getStaffList(params).then((res) => res.data),
    enabled: options?.enabled ?? true,
  });

export const useStaff = (id: number, options?: { enabled?: boolean }) =>
  useQuery<Staff>({
    queryKey: staffKeys.detail(id),
    queryFn: () => staffService.getStaff(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffFormValues) => staffService.createStaff(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff created successfully");
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create staff"));
    },
  });
};

export const useUpdateStaff = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StaffFormValues>) =>
      staffService.updateStaff(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff updated successfully");
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update staff"));
    },
  });
};

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => staffService.deleteStaff(id),
    onSuccess: () => {
      toast.success("Staff deleted successfully");
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete staff"));
    },
  });
};

export const useActivateStaff = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => staffService.activateStaff(id).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff activated");
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to activate staff"));
    },
  });
};

export const useDeactivateStaff = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => staffService.deactivateStaff(id).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff deactivated");
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to deactivate staff"));
    },
  });
};
