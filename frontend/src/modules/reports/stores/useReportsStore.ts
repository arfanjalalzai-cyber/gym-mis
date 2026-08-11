import { create } from "zustand";

import type { AllowedMonths, PaymentMethod } from "../types/reports";

export type PaymentMethodFilter = "all" | PaymentMethod;

interface ReportsStoreState {
  months: AllowedMonths;
  paymentMemberId: number | null;
  paymentMethod: PaymentMethodFilter;
  paymentDateFrom: string;
  paymentDateTo: string;
  paymentPage: number;
  paymentPageSize: number;
  activeSearch: string;
  activePage: number;
  activePageSize: number;
  unpaidSearch: string;
  unpaidPage: number;
  unpaidPageSize: number;
  setMonths: (months: AllowedMonths) => void;
  setPaymentMemberId: (memberId: number | null) => void;
  setPaymentMethod: (method: PaymentMethodFilter) => void;
  setPaymentDateFrom: (dateFrom: string) => void;
  setPaymentDateTo: (dateTo: string) => void;
  setPaymentPage: (page: number) => void;
  setPaymentPageSize: (pageSize: number) => void;
  setActiveSearch: (search: string) => void;
  setActivePage: (page: number) => void;
  setActivePageSize: (pageSize: number) => void;
  setUnpaidSearch: (search: string) => void;
  setUnpaidPage: (page: number) => void;
  setUnpaidPageSize: (pageSize: number) => void;
}

export const useReportsStore = create<ReportsStoreState>((set) => ({
  months: 12,
  paymentMemberId: null,
  paymentMethod: "all",
  paymentDateFrom: "",
  paymentDateTo: "",
  paymentPage: 1,
  paymentPageSize: 25,
  activeSearch: "",
  activePage: 1,
  activePageSize: 10,
  unpaidSearch: "",
  unpaidPage: 1,
  unpaidPageSize: 10,
  setMonths: (months) => set({ months }),
  setPaymentMemberId: (paymentMemberId) => set({ paymentMemberId, paymentPage: 1 }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod, paymentPage: 1 }),
  setPaymentDateFrom: (paymentDateFrom) => set({ paymentDateFrom, paymentPage: 1 }),
  setPaymentDateTo: (paymentDateTo) => set({ paymentDateTo, paymentPage: 1 }),
  setPaymentPage: (paymentPage) => set({ paymentPage }),
  setPaymentPageSize: (paymentPageSize) => set({ paymentPageSize, paymentPage: 1 }),
  setActiveSearch: (activeSearch) => set({ activeSearch, activePage: 1 }),
  setActivePage: (activePage) => set({ activePage }),
  setActivePageSize: (activePageSize) => set({ activePageSize, activePage: 1 }),
  setUnpaidSearch: (unpaidSearch) => set({ unpaidSearch, unpaidPage: 1 }),
  setUnpaidPage: (unpaidPage) => set({ unpaidPage }),
  setUnpaidPageSize: (unpaidPageSize) => set({ unpaidPageSize, unpaidPage: 1 }),
}));

