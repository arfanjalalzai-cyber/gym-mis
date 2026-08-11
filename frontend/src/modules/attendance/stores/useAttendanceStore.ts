import { create } from "zustand";

import type { AttendanceStatus } from "../types/attendance";

export type AttendanceStatusFilter = "all" | AttendanceStatus;

const getTodayInKabul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getCurrentMonthInKabul = () => getTodayInKabul().slice(0, 7);

interface AttendanceStoreState {
  selectedDate: string;
  reportMonth: string;
  selectedStaffId: number | null;
  search: string;
  status: AttendanceStatusFilter;
  page: number;
  page_size: number;
  setSelectedDate: (value: string) => void;
  setReportMonth: (value: string) => void;
  setSelectedStaffId: (value: number | null) => void;
  setSearch: (value: string) => void;
  setStatus: (value: AttendanceStatusFilter) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  resetFilters: () => void;
}

export const useAttendanceStore = create<AttendanceStoreState>((set) => ({
  selectedDate: getTodayInKabul(),
  reportMonth: getCurrentMonthInKabul(),
  selectedStaffId: null,
  search: "",
  status: "all",
  page: 1,
  page_size: 25,
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setReportMonth: (reportMonth) => set({ reportMonth }),
  setSelectedStaffId: (selectedStaffId) => set({ selectedStaffId }),
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setPage: (page) => set({ page }),
  setPageSize: (page_size) => set({ page_size }),
  resetFilters: () =>
    set({
      selectedDate: getTodayInKabul(),
      reportMonth: getCurrentMonthInKabul(),
      selectedStaffId: null,
      search: "",
      status: "all",
      page: 1,
      page_size: 25,
    }),
}));

