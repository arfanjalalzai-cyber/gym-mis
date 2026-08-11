export type CardHolderType = "member" | "staff";
export type MemberCardStatus = "active" | "expired";
export type StaffCardStatus = "active" | "inactive" | "on_leave" | "resigned";
export type CardStatus = MemberCardStatus | StaffCardStatus;

export interface CardDetail {
  id: number;
  card_id: string;
  holder_type: CardHolderType;
  holder_id: number;
  version: number;
  is_current: boolean;
  profile_code: string;
  full_name: string;
  photo_url: string | null;
  id_card_number: string | null;
  qr_value: string;
  barcode_value: string;
  member_valid_from: string | null;
  member_valid_to: string | null;
  card_status: CardStatus;
  generated_at: string;
  regenerate_reason: string | null;
  replaced_at: string | null;
}

export type CardHistoryItem = CardDetail;

export interface CardGenerateInput {
  holder_type: CardHolderType;
  holder_id: number;
}

export interface CardRegenerateInput {
  reason?: string;
}

export interface CardLookupResponse extends CardDetail {}

