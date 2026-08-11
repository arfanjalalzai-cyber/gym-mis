import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { inventoryService } from "../services/inventoryService";
import type {
  ChangeMachineStatusPayload,
  Equipment,
  EquipmentFormValues,
  EquipmentHistoryParams,
  EquipmentListParams,
  PaginatedEquipmentHistoryResponse,
  PaginatedEquipmentResponse,
  QuantityAdjustmentPayload,
} from "../types/equipment";

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (params?: EquipmentListParams) => [...inventoryKeys.lists(), params] as const,
  lowStock: (params?: EquipmentListParams) => [...inventoryKeys.all, "low-stock", params] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: number) => [...inventoryKeys.details(), id] as const,
  histories: () => [...inventoryKeys.all, "history"] as const,
  history: (id: number, params?: EquipmentHistoryParams) =>
    [...inventoryKeys.histories(), id, params] as const,
};

export const useEquipmentList = (params?: EquipmentListParams) =>
  useQuery<PaginatedEquipmentResponse>({
    queryKey: inventoryKeys.list(params),
    queryFn: () => inventoryService.getEquipmentList(params).then((res) => res.data),
  });

export const useLowStockEquipments = (params?: EquipmentListParams) =>
  useQuery<PaginatedEquipmentResponse>({
    queryKey: inventoryKeys.lowStock(params),
    queryFn: () => inventoryService.getLowStockEquipments(params).then((res) => res.data),
  });

export const useEquipment = (id: number, options?: { enabled?: boolean }) =>
  useQuery<Equipment>({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => inventoryService.getEquipment(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useEquipmentHistory = (
  id: number,
  params?: EquipmentHistoryParams,
  options?: { enabled?: boolean }
) =>
  useQuery<PaginatedEquipmentHistoryResponse>({
    queryKey: inventoryKeys.history(id, params),
    queryFn: () => inventoryService.getEquipmentHistory(id, params).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EquipmentFormValues) =>
      inventoryService.createEquipment(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Equipment created successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create equipment"));
    },
  });
};

export const useUpdateEquipment = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EquipmentFormValues>) =>
      inventoryService.updateEquipment(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Equipment updated successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.histories() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update equipment"));
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventoryService.deleteEquipment(id),
    onSuccess: () => {
      toast.success("Equipment deleted successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete equipment"));
    },
  });
};

export const useRestoreEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventoryService.restoreEquipment(id).then((res) => res.data),
    onSuccess: (_, id) => {
      toast.success("Equipment restored successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.histories() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to restore equipment"));
    },
  });
};

export const useAdjustEquipmentQuantity = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuantityAdjustmentPayload) =>
      inventoryService.adjustQuantity(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Quantity adjusted successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.history(id) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to adjust quantity"));
    },
  });
};

export const useChangeEquipmentStatus = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangeMachineStatusPayload) =>
      inventoryService.changeMachineStatus(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Machine status updated successfully");
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.history(id) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update machine status"));
    },
  });
};
