export type ExpenseCategory = string;
export type ExpenseTransactionType = "expense" | "return";

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";
export type AllowedMonths = 6 | 12 | 24;

export interface Expense {
  id: number;
  expense_name: string;
  amount: string;
  expense_date: string;
  category: ExpenseCategory;
  transaction_type: ExpenseTransactionType;
  note: string | null;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecentExpenseItem {
  id: number;
  expense_name: string;
  amount: string;
  expense_date: string;
  category: ExpenseCategory;
  transaction_type: ExpenseTransactionType;
  note: string | null;
}

export interface ExpenseCreateInput {
  expense_name: string;
  amount: number;
  expense_date: string;
  category: ExpenseCategory;
  transaction_type?: ExpenseTransactionType;
  note?: string;
}

export interface ExpenseCategoryItem {
  id: number;
  name: string;
  slug: ExpenseCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryCreateInput {
  name: string;
}

export interface ExpenseNameOption {
  id: number;
  label: string;
  expense_name: string;
  category: ExpenseCategory;
}

export interface ExpensePeriodSummaryItem {
  date_from: string;
  date_to: string;
  expense: string;
  return: string;
  net_expense: string;
}

export interface ExpensePeriodSummaryResponse {
  report_date: string;
  daily: ExpensePeriodSummaryItem;
  weekly: ExpensePeriodSummaryItem;
  weekly_days: ExpensePeriodSummaryItem[];
}

export interface ActiveMemberReportItem {
  member_id: number;
  member_code: string;
  member_name: string;
  membership_plan: string;
  membership_expiry_date: string | null;
}

export interface UnpaidMemberReportItem {
  member_id: number;
  member_code: string;
  member_name: string;
  remaining_balance: string;
  outstanding_cycles_count: number;
  oldest_unpaid_cycle_month: string | null;
}

export interface PaymentHistoryReportItem {
  payment_id: number;
  member_id: number;
  member_name: string;
  amount: string;
  paid_at: string;
  payment_method: PaymentMethod;
  is_reversal: boolean;
}

export interface MonthlyIncomeReportRow {
  month: string;
  gross_received: string;
  reversals: string;
  net_received: string;
  payment_count: number;
}

export interface MonthlyIncomeReportResponse {
  range: {
    from_month: string;
    to_month: string;
  };
  summary: {
    gross_received: string;
    reversal_total: string;
    net_received: string;
    payment_count: number;
  };
  results: MonthlyIncomeReportRow[];
}

export interface AnalyticsIncomePoint {
  month: string;
  value: string;
}

export interface AnalyticsExpensePoint {
  month: string;
  value: string;
}

export interface AnalyticsMemberGrowthPoint {
  month: string;
  new_members: number;
  cumulative_members: number;
}

export interface AnalyticsOverviewResponse {
  income_series: AnalyticsIncomePoint[];
  expense_series: AnalyticsExpensePoint[];
  member_growth_series: AnalyticsMemberGrowthPoint[];
}

export interface ReportsSummaryResponse {
  active_members_count: number;
  total_unpaid_balance: string;
  current_month_expenses: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ExpenseListParams {
  date_from?: string;
  date_to?: string;
  category?: ExpenseCategory;
  transaction_type?: ExpenseTransactionType;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ActiveMembersReportParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export interface UnpaidMembersReportParams {
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PaymentHistoryReportParams {
  member_id?: number;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ExpenseFormValues {
  expense_name: string;
  amount: number;
  expense_date: string;
  category: ExpenseCategory;
  transaction_type: ExpenseTransactionType;
  note?: string;
}
