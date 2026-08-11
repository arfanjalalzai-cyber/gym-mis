export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleClass {
  id: number;
  class_code: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  max_capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleClassListItem {
  id: number;
  class_code: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  max_capacity: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleClassFormValues {
  name: string;
  description?: string;
  default_duration_minutes: number;
  max_capacity?: number;
  is_active: boolean;
}

export interface ScheduleClassListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  ordering?: "created_at" | "-created_at" | "name" | "-name" | "default_duration_minutes" | "-default_duration_minutes";
}

export interface ScheduleSlot {
  id: number;
  schedule_class: number;
  class_name: string;
  class_code: string;
  class_capacity: number | null;
  active_member_count: number;
  trainer: number;
  trainer_id: number;
  trainer_code: string;
  trainer_name: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSlotListItem {
  id: number;
  schedule_class: number;
  class_name: string;
  class_code: string;
  class_capacity: number | null;
  active_member_count: number;
  trainer: number;
  trainer_id: number;
  trainer_code: string;
  trainer_name: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleSlotFormValues {
  schedule_class: number;
  trainer: number;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  is_active: boolean;
}

export interface ScheduleSlotListParams {
  page?: number;
  page_size?: number;
  search?: string;
  weekday?: Weekday;
  trainer?: number;
  schedule_class?: number;
  is_active?: boolean;
  ordering?: "created_at" | "-created_at" | "weekday" | "-weekday" | "start_time" | "-start_time";
}

export interface ScheduleConflictDiagnostic {
  slot_id: number;
  reason: "trainer_overlap" | "class_overlap";
  weekday: Weekday;
  start_time: string;
  end_time: string;
  class_name: string;
  trainer_name: string;
}

export interface WeeklyScheduleDay {
  weekday: Weekday;
  label: string;
  date: string;
  slots: ScheduleSlotListItem[];
}

export interface WeeklyScheduleResponse {
  week_start: string;
  week_end: string;
  days: WeeklyScheduleDay[];
}

export interface WeeklyScheduleParams {
  week_start?: string;
  trainer_id?: number;
  class_id?: number;
}

export interface TrainerOption {
  id: number;
  trainer_code: string;
  trainer_name: string;
}

export interface PaginatedScheduleClassesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ScheduleClassListItem[];
}

export interface PaginatedScheduleSlotsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ScheduleSlotListItem[];
}
