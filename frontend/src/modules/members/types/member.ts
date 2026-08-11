export type MemberStatus = "active" | "inactive";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface Member {
  id: number;
  member_code: string;
  id_card_number: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  email: string | null;
  blood_group: BloodGroup | null;
  profile_picture: string | null;
  profile_picture_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  bmi_category: BmiCategory | null;
  join_date: string;
  membership_plan_template: number | null;
  membership_plan_name: string | null;
  membership_plan_duration_type: string | null;
  membership_plan_duration_months: number | null;
  membership_plan_fee: string | null;
  schedule_class: number | null;
  schedule_class_name: string | null;
  schedule_class_code: string | null;
  schedule_slot: number | null;
  schedule_slot_class_name: string | null;
  schedule_slot_class_code: string | null;
  schedule_slot_weekday: number | null;
  schedule_slot_start_time: string | null;
  schedule_slot_end_time: string | null;
  schedule_slot_trainer_name: string | null;
  status: MemberStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberListItem {
  id: number;
  member_code: string;
  id_card_number: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  email: string | null;
  blood_group: BloodGroup | null;
  profile_picture: string | null;
  profile_picture_url: string | null;
  join_date: string;
  status: MemberStatus;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  bmi_category: BmiCategory | null;
  created_at: string;
  membership_plan_template: number | null;
  membership_plan_name: string | null;
  membership_plan_duration_type: string | null;
  membership_plan_duration_months: number | null;
  membership_plan_fee: string | null;
  schedule_class: number | null;
  schedule_class_name: string | null;
  schedule_class_code: string | null;
  schedule_slot: number | null;
  schedule_slot_class_name: string | null;
  schedule_slot_class_code: string | null;
  schedule_slot_weekday: number | null;
  schedule_slot_start_time: string | null;
  schedule_slot_end_time: string | null;
  schedule_slot_trainer_name: string | null;
}

export interface MemberBodyMetricHistoryItem {
  id: number;
  member: number;
  measurement_date: string;
  height_cm: string;
  weight_kg: string;
  bmi: string;
  bmi_category: BmiCategory;
  created_at: string;
}

export interface MemberFormValues {
  first_name: string;
  last_name: string;
  phone: string;
  address?: string;
  id_card_number?: string;
  email?: string;
  blood_group?: BloodGroup;
  profile_picture?: FileList | null;
  date_of_birth?: string;
  gender?: Gender;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  height_cm?: number;
  weight_kg?: number;
  join_date: string;
  membership_plan_template?: number | null;
  schedule_class?: number | null;
  schedule_slot?: number | null;
  status: MemberStatus;
  notes?: string;
}

export interface MemberListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: MemberStatus;
  ordering?: "created_at" | "-created_at" | "join_date" | "-join_date" | "last_name" | "-last_name";
}

export interface PaginatedMembersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MemberListItem[];
}
