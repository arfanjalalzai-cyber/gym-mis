import apiClient from "@/lib/api";

import type {
  MemberCycleUpsertInput,
  MemberFeeCycle,
  MemberFeeCycleListParams,
  MemberFeeCycleSummary,
  MemberFeePayment,
  MemberFeePaymentCreateInput,
  MemberFeePaymentListParams,
  MemberFeePlanCreateInput,
  MemberFeePlan,
  PaginatedMemberFeePaymentsResponse,
  PaginatedStaffSalaryPaymentsResponse,
  StaffPeriodUpsertInput,
  StaffSalaryPayment,
  StaffSalaryPaymentCreateInput,
  StaffSalaryPaymentListParams,
  StaffSalaryPeriod,
  StaffSalaryPeriodListParams,
  StaffSalarySummary,
} from "../types/payments";

export const paymentsService = {
  getMemberFeePlans: (params?: { member_id?: number }) =>
    apiClient.get<MemberFeePlan[]>("/payments/member-fee-plans/", { params }),

  createMemberFeePlan: (data: MemberFeePlanCreateInput) =>
    apiClient.post<MemberFeePlan>("/payments/member-fee-plans/", data),

  updateMemberFeePlan: (id: number, data: Partial<MemberFeePlan>) =>
    apiClient.patch<MemberFeePlan>(`/payments/member-fee-plans/${id}/`, data),

  getMemberFeeCycles: (params?: MemberFeeCycleListParams) =>
    apiClient.get<{ count: number; next: string | null; previous: string | null; results: MemberFeeCycle[] }>(
      "/payments/member-fee-cycles/",
      { params }
    ),

  upsertMemberFeeCycle: (data: MemberCycleUpsertInput) =>
    apiClient.post<MemberFeeCycle>("/payments/member-fee-cycles/upsert/", data),

  getMemberFeeSummary: (member_id: number) =>
    apiClient.get<MemberFeeCycleSummary>("/payments/member-fee-cycles/summary/", {
      params: { member_id },
    }),

  getMemberFeePayments: (params?: MemberFeePaymentListParams) =>
    apiClient.get<PaginatedMemberFeePaymentsResponse>("/payments/member-fee-payments/", { params }),

  createMemberFeePayment: (data: MemberFeePaymentCreateInput) =>
    apiClient.post<MemberFeePayment>("/payments/member-fee-payments/", data),

  reverseMemberFeePayment: (id: number, reason?: string) =>
    apiClient.post<MemberFeePayment>(`/payments/member-fee-payments/${id}/reverse/`, {
      reason,
    }),

  getStaffSalaryPeriods: (params?: StaffSalaryPeriodListParams) =>
    apiClient.get<{ count: number; next: string | null; previous: string | null; results: StaffSalaryPeriod[] }>(
      "/payments/staff-salary-periods/",
      { params }
    ),

  getStaffSalaryPeriod: (id: number) =>
    apiClient.get<StaffSalaryPeriod>(`/payments/staff-salary-periods/${id}/`),

  upsertStaffSalaryPeriod: (data: StaffPeriodUpsertInput) =>
    apiClient.post<StaffSalaryPeriod>("/payments/staff-salary-periods/upsert/", data),

  getStaffSalarySummary: (staff_id: number, period_month?: string) =>
    apiClient.get<StaffSalarySummary>("/payments/staff-salary-periods/summary/", {
      params: { staff_id, period_month },
    }),

  getStaffSalaryPayments: (params?: StaffSalaryPaymentListParams) =>
    apiClient.get<PaginatedStaffSalaryPaymentsResponse>("/payments/staff-salary-payments/", {
      params,
    }),

  createStaffSalaryPayment: (data: StaffSalaryPaymentCreateInput) =>
    apiClient.post<StaffSalaryPayment>("/payments/staff-salary-payments/", data),

  reverseStaffSalaryPayment: (id: number, reason?: string) =>
    apiClient.post<StaffSalaryPayment>(`/payments/staff-salary-payments/${id}/reverse/`, {
      reason,
    }),
};
