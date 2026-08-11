import apiClient from "@/lib/api";
import type {
  Member,
  MemberBodyMetricHistoryItem,
  MemberFormValues,
  MemberListParams,
  PaginatedMembersResponse,
} from "../types/member";

const appendValue = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined) return;

  if (value === null) {
    if (key === "membership_plan_template" || key === "schedule_class" || key === "schedule_slot") {
      formData.append(key, "");
    }
    return;
  }

  if (key === "profile_picture") {
    if (value instanceof FileList) {
      if (value.length > 0) {
        formData.append(key, value[0]);
      }
    } else if (value instanceof File) {
      formData.append(key, value);
    }

    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    formData.append(key, String(value));
    return;
  }

  if (typeof value === "string") {
    if (!value.trim()) return;
    formData.append(key, value);
    return;
  }

  if (value instanceof File) {
    formData.append(key, value);
  }
};

const toMemberFormData = (data: Partial<MemberFormValues>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => appendValue(formData, key, value));
  return formData;
};

export const memberService = {
  getMembers: (params?: MemberListParams) =>
    apiClient.get<PaginatedMembersResponse>("/members/members/", { params }),

  getMember: (id: number) =>
    apiClient.get<Member>(`/members/members/${id}/`),

  getMemberBodyMetricHistory: (id: number) =>
    apiClient.get<MemberBodyMetricHistoryItem[]>(`/members/members/${id}/body-metrics/history/`),

  createMember: (data: MemberFormValues) =>
    apiClient.post<Member>("/members/members/", toMemberFormData(data)),

  updateMember: (id: number, data: Partial<MemberFormValues>) =>
    apiClient.patch<Member>(`/members/members/${id}/`, toMemberFormData(data)),

  deleteMember: (id: number) =>
    apiClient.delete(`/members/members/${id}/`),

  activateMember: (id: number) =>
    apiClient.post<{ message: string }>(`/members/members/${id}/activate/`),

  deactivateMember: (id: number) =>
    apiClient.post<{ message: string }>(`/members/members/${id}/deactivate/`),
};
