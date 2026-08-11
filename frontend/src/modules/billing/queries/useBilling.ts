import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { billingService } from "../services/billingService";
import type { BillGenerateInput, BillListParams } from "../types/billing";

export const billingKeys = {
  all: ["billing"] as const,
  list: (params?: BillListParams) => [...billingKeys.all, "list", params] as const,
  detail: (id: number) => [...billingKeys.all, "detail", id] as const,
};

export const useBillsList = (params?: BillListParams) =>
  useQuery({
    queryKey: billingKeys.list(params),
    queryFn: () => billingService.getBills(params).then((res) => res.data),
  });

export const useBill = (id: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: billingKeys.detail(id),
    queryFn: () => billingService.getBill(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useGenerateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BillGenerateInput) =>
      billingService.generateBill(data).then((res) => res.data),
    onSuccess: (createdBill) => {
      toast.success("Bill generated successfully");
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: billingKeys.detail(createdBill.id) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to generate bill"));
    },
  });
};

