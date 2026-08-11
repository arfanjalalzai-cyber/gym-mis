import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { paymentsService } from "../services/paymentsService";
import type {
  MemberCycleUpsertInput,
  MemberFeePlanCreateInput,
  MemberFeeCycleListParams,
  MemberFeePaymentCreateInput,
  MemberFeePaymentListParams,
  StaffPeriodUpsertInput,
  StaffSalaryPaymentCreateInput,
  StaffSalaryPaymentListParams,
  StaffSalaryPeriodListParams,
} from "../types/payments";

export const paymentKeys = {
  all: ["payments"] as const,
  memberPlans: () => [...paymentKeys.all, "member-plans"] as const,
  memberCycles: () => [...paymentKeys.all, "member-cycles"] as const,
  memberCycleList: (params?: MemberFeeCycleListParams) =>
    [...paymentKeys.memberCycles(), "list", params] as const,
  memberSummary: (memberId?: number) =>
    [...paymentKeys.memberCycles(), "summary", memberId ?? "none"] as const,
  memberPayments: () => [...paymentKeys.all, "member-payments"] as const,
  memberPaymentList: (params?: MemberFeePaymentListParams) =>
    [...paymentKeys.memberPayments(), "list", params] as const,

  staffPeriods: () => [...paymentKeys.all, "staff-periods"] as const,
  staffPeriodDetail: (id: number) => [...paymentKeys.staffPeriods(), "detail", id] as const,
  staffPeriodList: (params?: StaffSalaryPeriodListParams) =>
    [...paymentKeys.staffPeriods(), "list", params] as const,
  staffSummary: (staffId?: number, periodMonth?: string) =>
    [...paymentKeys.staffPeriods(), "summary", staffId ?? "none", periodMonth ?? "current"] as const,
  staffPayments: () => [...paymentKeys.all, "staff-payments"] as const,
  staffPaymentList: (params?: StaffSalaryPaymentListParams) =>
    [...paymentKeys.staffPayments(), "list", params] as const,
};

export const useMemberFeeSummary = (memberId?: number) =>
  useQuery({
    queryKey: paymentKeys.memberSummary(memberId),
    queryFn: () => paymentsService.getMemberFeeSummary(memberId as number).then((res) => res.data),
    enabled: Boolean(memberId),
  });

export const useMemberFeePaymentList = (params?: MemberFeePaymentListParams, enabled = true) =>
  useQuery({
    queryKey: paymentKeys.memberPaymentList(params),
    queryFn: () => paymentsService.getMemberFeePayments(params).then((res) => res.data),
    enabled,
  });

export const useCreateMemberFeePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberFeePlanCreateInput) =>
      paymentsService.createMemberFeePlan(data).then((res) => res.data),
    onSuccess: (created) => {
      toast.success("Member fee plan created successfully");
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberPlans() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberSummary(created.member) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberCycles() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create member fee plan"));
    },
  });
};

export const useCreateMemberFeePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberFeePaymentCreateInput) =>
      paymentsService.createMemberFeePayment(data).then((res) => res.data),
    onSuccess: (created) => {
      toast.success("Member payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberPayments() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberSummary(created.member) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberCycles() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create member payment"));
    },
  });
};

export const useReverseMemberFeePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      paymentsService.reverseMemberFeePayment(id, reason).then((res) => res.data),
    onSuccess: (created) => {
      toast.success("Member payment reversed successfully");
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberPayments() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberSummary(created.member) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberCycles() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to reverse member payment"));
    },
  });
};

export const useUpsertMemberFeeCycle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberCycleUpsertInput) =>
      paymentsService.upsertMemberFeeCycle(data).then((res) => res.data),
    onSuccess: (cycle) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberCycles() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.memberSummary(cycle.member) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to prepare fee cycle"));
    },
  });
};

export const useStaffSalarySummary = (staffId?: number, periodMonth?: string) =>
  useQuery({
    queryKey: paymentKeys.staffSummary(staffId, periodMonth),
    queryFn: () =>
      paymentsService.getStaffSalarySummary(staffId as number, periodMonth).then((res) => res.data),
    enabled: Boolean(staffId),
  });

export const useStaffSalaryPaymentList = (params?: StaffSalaryPaymentListParams, enabled = true) =>
  useQuery({
    queryKey: paymentKeys.staffPaymentList(params),
    queryFn: () => paymentsService.getStaffSalaryPayments(params).then((res) => res.data),
    enabled,
  });

export const useStaffSalaryPeriod = (id?: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: paymentKeys.staffPeriodDetail(id ?? 0),
    queryFn: () => paymentsService.getStaffSalaryPeriod(id as number).then((res) => res.data),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });

export const useCreateStaffSalaryPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffSalaryPaymentCreateInput) =>
      paymentsService.createStaffSalaryPayment(data).then((res) => res.data),
    onSuccess: (created) => {
      toast.success("Staff salary payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffPayments() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffSummary(created.staff) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffPeriods() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to create staff salary payment"));
    },
  });
};

export const useReverseStaffSalaryPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      paymentsService.reverseStaffSalaryPayment(id, reason).then((res) => res.data),
    onSuccess: (created) => {
      toast.success("Staff salary payment reversed successfully");
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffPayments() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffSummary(created.staff) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffPeriods() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to reverse staff salary payment"));
    },
  });
};

export const useUpsertStaffSalaryPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffPeriodUpsertInput) =>
      paymentsService.upsertStaffSalaryPeriod(data).then((res) => res.data),
    onSuccess: (period) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffPeriods() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.staffSummary(period.staff, period.period_month) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to prepare salary period"));
    },
  });
};
