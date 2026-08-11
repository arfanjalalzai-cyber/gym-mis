import { create } from "zustand";

import type { BillPaymentStatus } from "../types/billing";

export type BillStatusFilter = "all" | BillPaymentStatus;

interface BillingStoreState {
  search: string;
  selectedMemberId: number | null;
  status: BillStatusFilter;
  billingDateFrom: string;
  billingDateTo: string;
  page: number;
  page_size: number;
  setSearch: (search: string) => void;
  setSelectedMemberId: (memberId: number | null) => void;
  setStatus: (status: BillStatusFilter) => void;
  setBillingDateFrom: (billingDateFrom: string) => void;
  setBillingDateTo: (billingDateTo: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
}

export const useBillingStore = create<BillingStoreState>((set) => ({
  search: "",
  selectedMemberId: null,
  status: "all",
  billingDateFrom: "",
  billingDateTo: "",
  page: 1,
  page_size: 25,
  setSearch: (search) => set({ search, page: 1 }),
  setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setBillingDateFrom: (billingDateFrom) => set({ billingDateFrom, page: 1 }),
  setBillingDateTo: (billingDateTo) => set({ billingDateTo, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (page_size) => set({ page_size, page: 1 }),
  resetFilters: () =>
    set({
      search: "",
      selectedMemberId: null,
      status: "all",
      billingDateFrom: "",
      billingDateTo: "",
      page: 1,
      page_size: 25,
    }),
}));

