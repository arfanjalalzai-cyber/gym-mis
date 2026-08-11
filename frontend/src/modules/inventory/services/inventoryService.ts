import apiClient from "@/lib/api";
import type {
  ChangeMachineStatusPayload,
  Equipment,
  EquipmentFormValues,
  EquipmentHistoryParams,
  PaginatedEquipmentHistoryResponse,
  PaginatedEquipmentResponse,
  QuantityAdjustmentPayload,
  EquipmentListParams,
} from "../types/equipment";

export const inventoryService = {
  getEquipmentList: (params?: EquipmentListParams) =>
    apiClient.get<PaginatedEquipmentResponse>("/inventory/equipment/", { params }),

  getEquipment: (id: number) => apiClient.get<Equipment>(`/inventory/equipment/${id}/`),

  createEquipment: (data: EquipmentFormValues) =>
    apiClient.post<Equipment>("/inventory/equipment/", data),

  updateEquipment: (id: number, data: Partial<EquipmentFormValues>) =>
    apiClient.patch<Equipment>(`/inventory/equipment/${id}/`, data),

  deleteEquipment: (id: number) => apiClient.delete(`/inventory/equipment/${id}/`),

  restoreEquipment: (id: number) =>
    apiClient.post<Equipment>(`/inventory/equipment/${id}/restore/`),

  adjustQuantity: (id: number, data: QuantityAdjustmentPayload) =>
    apiClient.post<Equipment>(`/inventory/equipment/${id}/adjust-quantity/`, data),

  changeMachineStatus: (id: number, data: ChangeMachineStatusPayload) =>
    apiClient.post<Equipment>(`/inventory/equipment/${id}/change-status/`, data),

  getEquipmentHistory: (id: number, params?: EquipmentHistoryParams) =>
    apiClient.get<PaginatedEquipmentHistoryResponse>(`/inventory/equipment/${id}/history/`, {
      params,
    }),

  getLowStockEquipments: (params?: EquipmentListParams) =>
    apiClient.get<PaginatedEquipmentResponse>("/inventory/equipment/low-stock/", {
      params,
    }),
};
