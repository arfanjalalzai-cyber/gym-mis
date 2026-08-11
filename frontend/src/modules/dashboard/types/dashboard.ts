export type AllowedMonths = 6 | 12 | 24;

export interface DashboardKeyStatistics {
  total_members: number;
  active_members: number;
  inactive_members: number;
  unpaid_members: number;
  expired_members: number;
  total_staff: number;
  monthly_income: string;
  monthly_expense: string;
  net_monthly_profit: string;
  today_attendance: number;
}

export interface DashboardPendingPayments {
  total_amount: string;
  member_count: number;
}

export interface DashboardFinancialOverview {
  today_income: string;
  monthly_income: string;
  pending_payments: DashboardPendingPayments;
}

export interface DashboardMemberGrowthPoint {
  month: string;
  new_members: number;
  cumulative_members: number;
}

export interface DashboardMonthlyIncomePoint {
  month: string;
  value: string;
}

export interface DashboardExpenseVsIncomePoint {
  month: string;
  income: string;
  expense: string;
}

export interface DashboardCharts {
  member_growth: DashboardMemberGrowthPoint[];
  monthly_income: DashboardMonthlyIncomePoint[];
  expense_vs_income: DashboardExpenseVsIncomePoint[];
}

export interface DashboardOverviewResponse {
  generated_at: string;
  currency: string;
  key_statistics: DashboardKeyStatistics;
  financial_overview: DashboardFinancialOverview;
  charts: DashboardCharts;
}

export interface RecentMemberRegistration {
  member_id: number;
  member_code: string;
  member_name: string;
  join_date: string;
  created_at: string;
}

export interface RecentPayment {
  payment_id: number;
  member_id: number;
  member_name: string;
  amount: string;
  payment_method: string;
  is_reversal: boolean;
  paid_at: string;
}

export interface RecentStaffAttendance {
  record_id: number;
  staff_id: number;
  staff_code: string;
  staff_name: string;
  attendance_date: string;
  status: string;
  marked_by_username: string | null;
  updated_at: string;
}

export interface DashboardActivityResponse {
  recent_member_registrations: RecentMemberRegistration[];
  recent_payments: RecentPayment[];
  recent_staff_attendance: RecentStaffAttendance[];
}

export interface ExpiredMembershipAlert {
  member_id: number;
  member_code: string;
  member_name: string;
  membership_expiry_date: string | null;
  days_overdue: number | null;
}

export interface PaymentDueAlert {
  member_id: number;
  member_code: string;
  member_name: string;
  remaining_balance: string;
  oldest_unpaid_cycle_month: string | null;
  outstanding_cycles_count: number;
}

export interface DashboardAlertsTotals {
  expired_memberships: number;
  payment_due_members: number;
}

export interface DashboardAlertsResponse {
  expired_membership_alerts: ExpiredMembershipAlert[];
  payment_due_alerts: PaymentDueAlert[];
  totals: DashboardAlertsTotals;
}
