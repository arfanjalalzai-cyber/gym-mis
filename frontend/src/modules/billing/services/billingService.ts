import apiClient from "@/lib/api";
import type {
  Bill,
  BillGenerateInput,
  BillListParams,
  PaginatedBillsResponse,
} from "../types/billing";

export const billingService = {
  getBills: (params?: BillListParams) =>
    apiClient.get<PaginatedBillsResponse>("/billing/bills/", { params }),

  getBill: (id: number) =>
    apiClient.get<Bill>(`/billing/bills/${id}/`),

  generateBill: (data: BillGenerateInput) =>
    apiClient.post<Bill>("/billing/bills/generate/", data),
};

