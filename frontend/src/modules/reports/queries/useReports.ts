import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { reportsService } from "../services/reportsService";
import type {
  ActiveMembersReportParams,
  AllowedMonths,
  ExpenseCategoryCreateInput,
  ExpenseCreateInput,
  ExpenseListParams,
  PaymentHistoryReportParams,
  UnpaidMembersReportParams,
} from "../types/reports";

export const reportsKeys = {
  all: ["reports"] as const,
  summary: () => [...reportsKeys.all, "summary"] as const,
  expenses: () => [...reportsKeys.all, "expenses"] as const,
  expenseCategories: () => [...reportsKeys.all, "expense-categories"] as const,
  expenseList: (params?: ExpenseListParams) =>
    [...reportsKeys.expenses(), "list", params] as const,
  expensePeriodSummary: (date?: string) =>
    [...reportsKeys.expenses(), "period-summary", date] as const,
  expenseNameOptions: () =>
    [...reportsKeys.expenses(), "name-options"] as const,
  recentExpenses: (limit: number) =>
    [...reportsKeys.expenses(), "recent", limit] as const,
  activeMembers: (params?: ActiveMembersReportParams) =>
    [...reportsKeys.all, "active-members", params] as const,
  unpaidMembers: (params?: UnpaidMembersReportParams) =>
    [...reportsKeys.all, "unpaid-members", params] as const,
  paymentHistory: (params?: PaymentHistoryReportParams) =>
    [...reportsKeys.all, "payment-history", params] as const,
  monthlyIncome: (months: AllowedMonths) =>
    [...reportsKeys.all, "monthly-income", months] as const,
  analyticsOverview: (months: AllowedMonths) =>
    [...reportsKeys.all, "analytics-overview", months] as const,
};

export const useReportsSummary = () =>
  useQuery({
    queryKey: reportsKeys.summary(),
    queryFn: () => reportsService.getSummary().then((res) => res.data),
  });

export const useRecentExpenses = (limit = 10) =>
  useQuery({
    queryKey: reportsKeys.recentExpenses(limit),
    queryFn: () => reportsService.getRecentExpenses(limit).then((res) => res.data),
  });

export const useExpenseList = (params?: ExpenseListParams, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.expenseList(params),
    queryFn: () => reportsService.getExpenses(params).then((res) => res.data),
    enabled,
  });

export const useExpensePeriodSummary = (date?: string) =>
  useQuery({
    queryKey: reportsKeys.expensePeriodSummary(date),
    queryFn: () => reportsService.getExpensePeriodSummary(date).then((res) => res.data),
  });

export const useExpenseNameOptions = () =>
  useQuery({
    queryKey: reportsKeys.expenseNameOptions(),
    queryFn: () => reportsService.getExpenseNameOptions().then((res) => res.data),
  });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: reportsKeys.expenseCategories(),
    queryFn: () => reportsService.getExpenseCategories().then((res) => res.data),
  });

export const useActiveMembersReport = (
  params?: ActiveMembersReportParams,
  enabled = true
) =>
  useQuery({
    queryKey: reportsKeys.activeMembers(params),
    queryFn: () => reportsService.getActiveMembersReport(params).then((res) => res.data),
    enabled,
  });

export const useUnpaidMembersReport = (
  params?: UnpaidMembersReportParams,
  enabled = true
) =>
  useQuery({
    queryKey: reportsKeys.unpaidMembers(params),
    queryFn: () => reportsService.getUnpaidMembersReport(params).then((res) => res.data),
    enabled,
  });

export const usePaymentHistoryReport = (
  params?: PaymentHistoryReportParams,
  enabled = true
) =>
  useQuery({
    queryKey: reportsKeys.paymentHistory(params),
    queryFn: () => reportsService.getPaymentHistoryReport(params).then((res) => res.data),
    enabled,
  });

export const useMonthlyIncomeReport = (months: AllowedMonths, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.monthlyIncome(months),
    queryFn: () => reportsService.getMonthlyIncomeReport(months).then((res) => res.data),
    enabled,
  });

export const useAnalyticsOverview = (months: AllowedMonths, enabled = true) =>
  useQuery({
    queryKey: reportsKeys.analyticsOverview(months),
    queryFn: () => reportsService.getAnalyticsOverview(months).then((res) => res.data),
    enabled,
  });

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCreateInput) =>
      reportsService.createExpense(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Expense added successfully");
      queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to add expense"));
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExpenseCreateInput }) =>
      reportsService.updateExpense(id, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Expense updated successfully");
      queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to update expense"));
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reportsService.deleteExpense(id),
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to delete expense"));
    },
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCategoryCreateInput) =>
      reportsService.createExpenseCategory(data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Expense category added successfully");
      queryClient.invalidateQueries({ queryKey: reportsKeys.expenseCategories() });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to add expense category"));
    },
  });
};
