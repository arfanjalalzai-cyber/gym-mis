export type StaffPosition = "trainer" | "manager" | "cleaner" | "other";
export type StaffEmploymentStatus = "active" | "inactive" | "on_leave" | "resigned";
export type StaffSalaryStatus = "paid" | "unpaid" | "partial";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface StaffAssignedClass {
  id: number;
  class_code: string;
  name: string;
}

export interface Staff {
  id: number;
  staff_code: string;
  position: StaffPosition;
  position_other: string | null;
  id_card_number: string | null;
  first_name: string;
  last_name: string;
  father_name: string | null;
  mobile_number: string;
  whatsapp_number: string | null;
  address: string;
  email: string | null;
  blood_group: BloodGroup | null;
  profile_picture: string | null;
  profile_picture_url: string | null;
  date_of_birth: string | null;
  age: number | null;
  date_hired: string;
  monthly_salary: number;
  salary_currency: string;
  salary_status: StaffSalaryStatus;
  employment_status: StaffEmploymentStatus;
  trainer_id: number | null;
  trainer_code: string | null;
  assigned_classes: StaffAssignedClass[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffListItem {
  id: number;
  staff_code: string;
  position: StaffPosition;
  position_other: string | null;
  first_name: string;
  last_name: string;
  mobile_number: string;
  address: string;
  email: string | null;
  date_hired: string;
  monthly_salary: number;
  salary_currency: string;
  salary_status: StaffSalaryStatus;
  employment_status: StaffEmploymentStatus;
  trainer_id: number | null;
  trainer_code: string | null;
  assigned_classes: StaffAssignedClass[];
  profile_picture: string | null;
  profile_picture_url: string | null;
  age: number | null;
  created_at: string;
}

export interface StaffFormValues {
  position: StaffPosition;
  position_other?: string;
  first_name: string;
  last_name: string;
  father_name?: string;
  mobile_number: string;
  whatsapp_number?: string;
  address?: string;
  id_card_number?: string;
  email?: string;
  blood_group?: BloodGroup;
  profile_picture?: FileList | null;
  date_of_birth?: string;
  date_hired: string;
  monthly_salary: number;
  salary_currency: string;
  salary_status: StaffSalaryStatus;
  employment_status: StaffEmploymentStatus;
  assigned_class_ids?: number[];
  notes?: string;
}

export interface StaffListParams {
  page?: number;
  page_size?: number;
  search?: string;
  position?: StaffPosition;
  employment_status?: StaffEmploymentStatus;
  salary_status?: StaffSalaryStatus;
  ordering?:
    | "created_at"
    | "-created_at"
    | "date_hired"
    | "-date_hired"
    | "last_name"
    | "-last_name"
    | "monthly_salary"
    | "-monthly_salary";
}

export interface PaginatedStaffResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StaffListItem[];
}
