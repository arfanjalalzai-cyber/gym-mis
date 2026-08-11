import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { usePaymentStore, type PaymentMethodFilter } from "../stores/usePaymentStore";
import type {
  MemberFeePaymentListParams,
  PaymentsTab,
  StaffSalaryPaymentListParams,
} from "../types/payments";

const VALID_TABS: PaymentsTab[] = ["member_fees", "staff_salaries"];
const VALID_PAYMENT_METHODS: PaymentMethodFilter[] = [
  "all",
  "cash",
  "bank_transfer",
  "online",
  "card",
  "other",
];

const parseIntOrNull = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseIntOrDefault = (value: string | null, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const usePaymentFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeTab,
    selectedMemberId,
    selectedStaffId,
    selectedCycleMonth,
    dateFrom,
    dateTo,
    paymentMethod,
    page,
    page_size,
    setActiveTab,
    setSelectedMemberId,
    setSelectedStaffId,
    setSelectedCycleMonth,
    setDateFrom,
    setDateTo,
    setPaymentMethod,
    setPage,
    setPageSize,
  } = usePaymentStore();

  useEffect(() => {
    const tab = searchParams.get("tab");
    const memberId = parseIntOrNull(searchParams.get("member_id"));
    const staffId = parseIntOrNull(searchParams.get("staff_id"));
    const cycleMonth = searchParams.get("cycle_month") ?? selectedCycleMonth;
    const parsedDateFrom = searchParams.get("from") ?? "";
    const parsedDateTo = searchParams.get("to") ?? "";
    const parsedMethod = searchParams.get("payment_method") ?? "all";
    const parsedPage = parseIntOrDefault(searchParams.get("page"), 1);
    const parsedPageSize = parseIntOrDefault(searchParams.get("page_size"), 25);

    const normalizedTab = VALID_TABS.includes(tab as PaymentsTab)
      ? (tab as PaymentsTab)
      : "member_fees";
    const normalizedMethod = VALID_PAYMENT_METHODS.includes(parsedMethod as PaymentMethodFilter)
      ? (parsedMethod as PaymentMethodFilter)
      : "all";

    if (activeTab !== normalizedTab) setActiveTab(normalizedTab);
    if (selectedMemberId !== memberId) setSelectedMemberId(memberId);
    if (selectedStaffId !== staffId) setSelectedStaffId(staffId);
    if (selectedCycleMonth !== cycleMonth) setSelectedCycleMonth(cycleMonth);
    if (dateFrom !== parsedDateFrom) setDateFrom(parsedDateFrom);
    if (dateTo !== parsedDateTo) setDateTo(parsedDateTo);
    if (paymentMethod !== normalizedMethod) setPaymentMethod(normalizedMethod);
    if (page !== parsedPage) setPage(parsedPage);
    if (page_size !== parsedPageSize) setPageSize(parsedPageSize);
  }, [
    activeTab,
    dateFrom,
    dateTo,
    page,
    page_size,
    paymentMethod,
    searchParams,
    selectedCycleMonth,
    selectedMemberId,
    selectedStaffId,
    setActiveTab,
    setDateFrom,
    setDateTo,
    setPage,
    setPageSize,
    setPaymentMethod,
    setSelectedCycleMonth,
    setSelectedMemberId,
    setSelectedStaffId,
  ]);

  const updateSearchParams = useCallback(
    (patcher: (next: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        patcher(next);
        return next;
      });
    },
    [setSearchParams]
  );

  const updateTab = useCallback(
    (value: PaymentsTab) => {
      setActiveTab(value);
      setPage(1);
      updateSearchParams((next) => {
        next.set("tab", value);
        next.set("page", "1");
      });
    },
    [setActiveTab, setPage, updateSearchParams]
  );

  const updateMember = useCallback(
    (value: number | null) => {
      setSelectedMemberId(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("member_id", String(value));
        else next.delete("member_id");
        next.set("page", "1");
      });
    },
    [setPage, setSelectedMemberId, updateSearchParams]
  );

  const updateStaff = useCallback(
    (value: number | null) => {
      setSelectedStaffId(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("staff_id", String(value));
        else next.delete("staff_id");
        next.set("page", "1");
      });
    },
    [setPage, setSelectedStaffId, updateSearchParams]
  );

  const updateCycleMonth = useCallback(
    (value: string) => {
      setSelectedCycleMonth(value);
      setPage(1);
      updateSearchParams((next) => {
        next.set("cycle_month", value);
        next.set("page", "1");
      });
    },
    [setPage, setSelectedCycleMonth, updateSearchParams]
  );

  const updateDateFrom = useCallback(
    (value: string) => {
      setDateFrom(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("from", value);
        else next.delete("from");
        next.set("page", "1");
      });
    },
    [setDateFrom, setPage, updateSearchParams]
  );

  const updateDateTo = useCallback(
    (value: string) => {
      setDateTo(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("to", value);
        else next.delete("to");
        next.set("page", "1");
      });
    },
    [setDateTo, setPage, updateSearchParams]
  );

  const updatePaymentMethod = useCallback(
    (value: PaymentMethodFilter) => {
      setPaymentMethod(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value === "all") next.delete("payment_method");
        else next.set("payment_method", value);
        next.set("page", "1");
      });
    },
    [setPage, setPaymentMethod, updateSearchParams]
  );

  const updatePage = useCallback(
    (value: number) => {
      setPage(value);
      updateSearchParams((next) => {
        next.set("page", String(value));
      });
    },
    [setPage, updateSearchParams]
  );

  const memberPaymentParams: MemberFeePaymentListParams = {
    member_id: selectedMemberId ?? undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    payment_method: paymentMethod === "all" ? undefined : paymentMethod,
    page,
    page_size,
  };

  const salaryPaymentParams: StaffSalaryPaymentListParams = {
    staff_id: selectedStaffId ?? undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    payment_method: paymentMethod === "all" ? undefined : paymentMethod,
    page,
    page_size,
  };

  return {
    activeTab,
    selectedMemberId,
    selectedStaffId,
    selectedCycleMonth,
    dateFrom,
    dateTo,
    paymentMethod,
    page,
    page_size,
    memberPaymentParams,
    salaryPaymentParams,
    updateTab,
    updateMember,
    updateStaff,
    updateCycleMonth,
    updateDateFrom,
    updateDateTo,
    updatePaymentMethod,
    updatePage,
  };
};
