import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { dashboardKeys } from "@/modules/dashboard/queries/useDashboard";
import { memberService } from "../services/memberService";
import type {
  Member,
  MemberBodyMetricHistoryItem,
  MemberFormValues,
  MemberListParams,
  PaginatedMembersResponse,
} from "../types/member";

export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: (params?: MemberListParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
  bodyMetricHistory: (id: number) => [...memberKeys.detail(id), "body-metrics-history"] as const,
};

export const useMembersList = (params?: MemberListParams, options?: { enabled?: boolean }) =>
  useQuery<PaginatedMembersResponse>({
    queryKey: memberKeys.list(params),
    queryFn: () => memberService.getMembers(params).then((res) => res.data),
    enabled: options?.enabled ?? true,
  });

export const useMember = (id: number, options?: { enabled?: boolean }) =>
  useQuery<Member>({
    queryKey: memberKeys.detail(id),
    queryFn: () => memberService.getMember(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useMemberBodyMetricHistory = (id: number, options?: { enabled?: boolean }) =>
  useQuery<MemberBodyMetricHistoryItem[]>({
    queryKey: memberKeys.bodyMetricHistory(id),
    queryFn: () => memberService.getMemberBodyMetricHistory(id).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberFormValues) =>
      memberService.createMember(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member created successfully");
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create member"));
    },
  });
};

export const useUpdateMember = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MemberFormValues>) =>
      memberService.updateMember(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member updated successfully");
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: memberKeys.bodyMetricHistory(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update member"));
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => memberService.deleteMember(id),
    onSuccess: () => {
      toast.success("Member deleted successfully");
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete member"));
    },
  });
};

export const useActivateMember = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => memberService.activateMember(id).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member activated");
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to activate member"));
    },
  });
};

export const useDeactivateMember = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => memberService.deactivateMember(id).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member deactivated");
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to deactivate member"));
    },
  });
};
