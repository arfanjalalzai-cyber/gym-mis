export type PaymentMethod = "cash" | "bank_transfer" | "online" | "card" | "other";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentsTab = "member_fees" | "staff_salaries";

export interface MemberFeePlan {
  id: number;
  member: number;
  member_code: string;
  member_name: string;
  billing_cycle: "monthly";
  cycle_fee_amount: string;
  default_cycle_discount_amount: string;
  currency: "AFN";
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberFeePlanCreateInput {
  member: number;
  billing_cycle: "monthly";
  cycle_fee_amount: string;
  default_cycle_discount_amount: string;
  currency: "AFN";
  effective_from: string;
  effective_to?: string | null;
}

export interface MemberFeeCycle {
  id: number;
  member: number;
  member_code: string;
  member_name: string;
  plan_id: number;
  cycle_month: string;
  base_due_amount: string;
  cycle_discount_amount: string;
  net_due_amount: string;
  paid_amount: string;
  payment_discount_amount: string;
  remaining_amount: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberFeeCycleSummary {
  current_cycle: MemberFeeCycle | null;
  current_cycle_remaining: string;
  total_outstanding: string;
  overdue_cycles_count: number;
  outstanding_cycles: MemberFeeCycle[];
  has_fee_plan: boolean;
}

export interface MemberFeePayment {
  id: number;
  member: number;
  member_code: string;
  member_name: string;
  cycle: number;
  cycle_month: string;
  amount_paid: string;
  discount_amount: string;
  payment_method: PaymentMethod;
  paid_at: string;
  note: string | null;
  is_reversal: boolean;
  reversal_of: number | null;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
}

export interface StaffSalaryPeriod {
  id: number;
  staff: number;
  staff_code: string;
  staff_name: string;
  period_month: string;
  gross_salary_amount: string;
  paid_amount: string;
  remaining_amount: string;
  status: PaymentStatus;
  currency: "AFN";
  created_at: string;
  updated_at: string;
}

export interface StaffSalarySummary {
  period_month: string;
  period: StaffSalaryPeriod | null;
  remaining_amount: string;
  status: PaymentStatus;
  total_outstanding: string;
  overdue_periods_count: number;
  outstanding_periods: StaffSalaryPeriod[];
}

export interface StaffSalaryPayment {
  id: number;
  staff: number;
  staff_code: string;
  staff_name: string;
  period: number;
  period_month: string;
  amount_paid: string;
  payment_method: PaymentMethod;
  paid_at: string;
  note: string | null;
  is_reversal: boolean;
  reversal_of: number | null;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
}

export interface MemberFeePaymentCreateInput {
  member_id: number;
  cycle_id?: number;
  amount_paid: number;
  discount_amount?: number;
  payment_method: PaymentMethod;
  paid_at: string;
  note?: string;
}

export interface StaffSalaryPaymentCreateInput {
  staff_id: number;
  period_id?: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: string;
  note?: string;
}

export interface MemberCycleUpsertInput {
  member_id: number;
  cycle_month: string;
  cycle_discount_amount?: number;
}

export interface StaffPeriodUpsertInput {
  staff_id: number;
  period_month: string;
}

export interface MemberFeeCycleListParams {
  member_id?: number;
  status?: PaymentStatus;
  cycle_month?: string;
  page?: number;
  page_size?: number;
}

export interface MemberFeePaymentListParams {
  member_id?: number;
  cycle_id?: number;
  from?: string;
  to?: string;
  payment_method?: PaymentMethod;
  page?: number;
  page_size?: number;
}

export interface StaffSalaryPeriodListParams {
  staff_id?: number;
  period_month?: string;
  status?: PaymentStatus;
  page?: number;
  page_size?: number;
}

export interface StaffSalaryPaymentListParams {
  staff_id?: number;
  period_id?: number;
  from?: string;
  to?: string;
  payment_method?: PaymentMethod;
  page?: number;
  page_size?: number;
}

export interface PaginatedMemberFeePaymentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MemberFeePayment[];
}

export interface PaginatedStaffSalaryPaymentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffSalaryPayment[];
}

export interface MemberPaymentFormValues {
  member_id: number;
  cycle_id?: number;
  amount_paid: number;
  discount_amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  note?: string;
}

export interface SalaryPaymentFormValues {
  staff_id: number;
  period_id?: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  paid_at: string;
  note?: string;
}
