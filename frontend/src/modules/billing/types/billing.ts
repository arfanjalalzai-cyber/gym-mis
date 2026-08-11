export type BillPaymentStatus = "unpaid" | "partial" | "paid";

export interface BillListItem {
  id: number;
  bill_number: string;
  member: number;
  member_code: string;
  member_name: string;
  original_fee_amount: string;
  discount_amount: string;
  final_amount: string;
  billing_date: string;
  payment_status: BillPaymentStatus;
  currency: string;
  created_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  member: number;
  member_code: string;
  member_name: string;
  member_role_or_position: string;
  membership_plan_or_class: string;
  schedule_class: number | null;
  schedule_class_name: string;
  cycle_id: number;
  cycle_month: string;
  original_fee_amount: string;
  discount_amount: string;
  final_amount: string;
  paid_amount: string;
  remaining_amount: string;
  total_outstanding_amount: string;
  total_paid_amount: string;
  total_discount_amount: string;
  billing_date: string;
  payment_status: BillPaymentStatus;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BillGenerateInput {
  member_id: number;
  billing_date: string;
  discount_amount: number;
  schedule_class_id?: number | null;
}

export interface BillListParams {
  search?: string;
  member_id?: number;
  status?: BillPaymentStatus;
  billing_date_from?: string;
  billing_date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: "billing_date" | "-billing_date" | "created_at" | "-created_at" | "final_amount" | "-final_amount";
}

export interface PaginatedBillsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BillListItem[];
}

export interface BillGenerateFormValues {
  member_id: number;
  schedule_class_id: number | null;
  billing_date: string;
  discount_amount: number;
  original_fee_amount: number;
}
