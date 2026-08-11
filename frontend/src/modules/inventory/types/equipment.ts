export type ItemType = "machine" | "accessory" | "consumable";

export type EquipmentCategory =
  | "cardio"
  | "strength"
  | "free_weight"
  | "functional"
  | "recovery"
  | "hygiene"
  | "nutrition"
  | "other";

export type MachineStatus =
  | "operational"
  | "in_use"
  | "maintenance"
  | "out_of_order"
  | "retired";

export type EquipmentHistoryEventType =
  | "created"
  | "updated"
  | "quantity_adjusted"
  | "status_changed"
  | "deleted"
  | "restored";

export type EquipmentHistoryEventSource =
  | "form_edit"
  | "adjustment_action"
  | "status_action"
  | "system";

export interface Equipment {
  id: number;
  equipment_code: string;
  name: string;
  item_type: ItemType;
  category: EquipmentCategory;
  quantity_on_hand: number;
  quantity_in_service: number;
  machine_status: MachineStatus | null;
  notes: string | null;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EquipmentListItem {
  id: number;
  equipment_code: string;
  name: string;
  item_type: ItemType;
  category: EquipmentCategory;
  quantity_on_hand: number;
  quantity_in_service: number;
  machine_status: MachineStatus | null;
  is_low_stock: boolean;
  created_at: string;
}

export interface EquipmentFormValues {
  name: string;
  item_type: ItemType;
  category: EquipmentCategory;
  quantity_on_hand: number;
  quantity_in_service: number;
  machine_status?: MachineStatus;
  notes?: string;
}

export interface EquipmentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  item_type?: ItemType;
  category?: EquipmentCategory;
  machine_status?: MachineStatus;
  low_stock?: boolean;
  include_deleted?: boolean;
  ordering?:
    | "created_at"
    | "-created_at"
    | "name"
    | "-name"
    | "quantity_on_hand"
    | "-quantity_on_hand"
    | "quantity_in_service"
    | "-quantity_in_service";
}

export interface QuantityAdjustmentPayload {
  target: "quantity_on_hand" | "quantity_in_service";
  operation: "increase" | "decrease" | "set";
  value: number;
  note?: string;
}

export interface ChangeMachineStatusPayload {
  machine_status: MachineStatus;
  note?: string;
}

export interface EquipmentHistoryEntry {
  id: number;
  equipment: number;
  event_type: EquipmentHistoryEventType;
  event_source: EquipmentHistoryEventSource;
  performed_by: number | null;
  performed_by_name: string | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  quantity_on_hand_delta: number | null;
  quantity_in_service_delta: number | null;
  note: string | null;
  created_at: string;
}

export interface EquipmentHistoryParams {
  page?: number;
  page_size?: number;
  event_type?: EquipmentHistoryEventType;
}

export interface PaginatedEquipmentResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EquipmentListItem[];
}

export interface PaginatedEquipmentHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EquipmentHistoryEntry[];
}
