import { create } from "zustand";

import type { PaymentMethod, PaymentsTab } from "../types/payments";

export type PaymentMethodFilter = "all" | PaymentMethod;

const getCurrentMonthStart = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

interface PaymentStoreState {
  activeTab: PaymentsTab;
  selectedMemberId: number | null;
  selectedStaffId: number | null;
  selectedCycleMonth: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: PaymentMethodFilter;
  page: number;
  page_size: number;
  setActiveTab: (tab: PaymentsTab) => void;
  setSelectedMemberId: (memberId: number | null) => void;
  setSelectedStaffId: (staffId: number | null) => void;
  setSelectedCycleMonth: (cycleMonth: string) => void;
  setDateFrom: (dateFrom: string) => void;
  setDateTo: (dateTo: string) => void;
  setPaymentMethod: (method: PaymentMethodFilter) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
}

export const usePaymentStore = create<PaymentStoreState>((set) => ({
  activeTab: "member_fees",
  selectedMemberId: null,
  selectedStaffId: null,
  selectedCycleMonth: getCurrentMonthStart(),
  dateFrom: "",
  dateTo: "",
  paymentMethod: "all",
  page: 1,
  page_size: 25,

  setActiveTab: (activeTab) => set({ activeTab, page: 1 }),
  setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId, page: 1 }),
  setSelectedStaffId: (selectedStaffId) => set({ selectedStaffId, page: 1 }),
  setSelectedCycleMonth: (selectedCycleMonth) => set({ selectedCycleMonth, page: 1 }),
  setDateFrom: (dateFrom) => set({ dateFrom, page: 1 }),
  setDateTo: (dateTo) => set({ dateTo, page: 1 }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (page_size) => set({ page_size, page: 1 }),
  resetFilters: () =>
    set({
      selectedCycleMonth: getCurrentMonthStart(),
      dateFrom: "",
      dateTo: "",
      paymentMethod: "all",
      page: 1,
      page_size: 25,
    }),
}));
