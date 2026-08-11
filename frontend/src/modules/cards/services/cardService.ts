import apiClient from "@/lib/api";

import type { CardDetail, CardHistoryItem, CardLookupResponse, CardRegenerateInput } from "../types/card";

export const cardService = {
  getMemberCard: (memberId: number) =>
    apiClient.get<CardDetail>(`/members/members/${memberId}/card/`),

  getMemberCardHistory: (memberId: number) =>
    apiClient.get<CardHistoryItem[]>(`/members/members/${memberId}/card/history/`),

  generateMemberCard: (memberId: number) =>
    apiClient.post<CardDetail>(`/members/members/${memberId}/card/generate/`),

  regenerateMemberCard: (memberId: number, data?: CardRegenerateInput) =>
    apiClient.post<CardDetail>(`/members/members/${memberId}/card/regenerate/`, data ?? {}),

  getStaffCard: (staffId: number) =>
    apiClient.get<CardDetail>(`/staff/staff/${staffId}/card/`),

  getStaffCardHistory: (staffId: number) =>
    apiClient.get<CardHistoryItem[]>(`/staff/staff/${staffId}/card/history/`),

  generateStaffCard: (staffId: number) =>
    apiClient.post<CardDetail>(`/staff/staff/${staffId}/card/generate/`),

  regenerateStaffCard: (staffId: number, data?: CardRegenerateInput) =>
    apiClient.post<CardDetail>(`/staff/staff/${staffId}/card/regenerate/`, data ?? {}),

  lookupCard: (cardId: string) =>
    apiClient.get<CardLookupResponse>("/cards/lookup/", {
      params: { card_id: cardId },
    }),
};

