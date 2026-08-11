import apiClient from "@/lib/api";
import type {
  PaginatedStaffResponse,
  Staff,
  StaffFormValues,
  StaffListParams,
} from "../types/staff";

const appendValue = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) return;

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

  if (key === "assigned_class_ids" && Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
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

const toStaffFormData = (data: Partial<StaffFormValues>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => appendValue(formData, key, value));
  return formData;
};

export const staffService = {
  getStaffList: (params?: StaffListParams) =>
    apiClient.get<PaginatedStaffResponse>("/staff/staff/", { params }),

  getStaff: (id: number) => apiClient.get<Staff>(`/staff/staff/${id}/`),

  createStaff: (data: StaffFormValues) =>
    apiClient.post<Staff>("/staff/staff/", toStaffFormData(data)),

  updateStaff: (id: number, data: Partial<StaffFormValues>) =>
    apiClient.patch<Staff>(`/staff/staff/${id}/`, toStaffFormData(data)),

  deleteStaff: (id: number) => apiClient.delete(`/staff/staff/${id}/`),

  activateStaff: (id: number) =>
    apiClient.post<{ message: string }>(`/staff/staff/${id}/activate/`),

  deactivateStaff: (id: number) =>
    apiClient.post<{ message: string }>(`/staff/staff/${id}/deactivate/`),
};
