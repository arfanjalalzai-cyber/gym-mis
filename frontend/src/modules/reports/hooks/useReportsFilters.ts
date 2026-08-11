import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useReportsStore,
  type PaymentMethodFilter,
} from "../stores/useReportsStore";
import type {
  ActiveMembersReportParams,
  AllowedMonths,
  PaymentHistoryReportParams,
  UnpaidMembersReportParams,
} from "../types/reports";

const VALID_MONTHS: AllowedMonths[] = [6, 12, 24];
const VALID_PAYMENT_METHODS: PaymentMethodFilter[] = [
  "all",
  "cash",
  "bank_transfer",
  "card",
  "other",
];

const parseIntOrDefault = (value: string | null, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseIntOrNull = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const useReportsFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    months,
    paymentMemberId,
    paymentMethod,
    paymentDateFrom,
    paymentDateTo,
    paymentPage,
    paymentPageSize,
    activeSearch,
    activePage,
    activePageSize,
    unpaidSearch,
    unpaidPage,
    unpaidPageSize,
    setMonths,
    setPaymentMemberId,
    setPaymentMethod,
    setPaymentDateFrom,
    setPaymentDateTo,
    setPaymentPage,
    setPaymentPageSize,
    setActiveSearch,
    setActivePage,
    setActivePageSize,
    setUnpaidSearch,
    setUnpaidPage,
    setUnpaidPageSize,
  } = useReportsStore();

  useEffect(() => {
    const urlMonthsRaw = parseIntOrDefault(searchParams.get("months"), 12);
    const urlMonths = VALID_MONTHS.includes(urlMonthsRaw as AllowedMonths)
      ? (urlMonthsRaw as AllowedMonths)
      : 12;
    const urlPaymentMemberId = parseIntOrNull(searchParams.get("member_id"));
    const urlPaymentMethodRaw = searchParams.get("payment_method") ?? "all";
    const urlPaymentMethod = VALID_PAYMENT_METHODS.includes(
      urlPaymentMethodRaw as PaymentMethodFilter
    )
      ? (urlPaymentMethodRaw as PaymentMethodFilter)
      : "all";
    const urlDateFrom = searchParams.get("date_from") ?? "";
    const urlDateTo = searchParams.get("date_to") ?? "";
    const urlPaymentPage = parseIntOrDefault(searchParams.get("payment_page"), 1);
    const urlPaymentPageSize = parseIntOrDefault(
      searchParams.get("payment_page_size"),
      25
    );
    const urlActiveSearch = searchParams.get("active_search") ?? "";
    const urlActivePage = parseIntOrDefault(searchParams.get("active_page"), 1);
    const urlActivePageSize = parseIntOrDefault(
      searchParams.get("active_page_size"),
      10
    );
    const urlUnpaidSearch = searchParams.get("unpaid_search") ?? "";
    const urlUnpaidPage = parseIntOrDefault(searchParams.get("unpaid_page"), 1);
    const urlUnpaidPageSize = parseIntOrDefault(
      searchParams.get("unpaid_page_size"),
      10
    );

    if (months !== urlMonths) setMonths(urlMonths);
    if (paymentMemberId !== urlPaymentMemberId) setPaymentMemberId(urlPaymentMemberId);
    if (paymentMethod !== urlPaymentMethod) setPaymentMethod(urlPaymentMethod);
    if (paymentDateFrom !== urlDateFrom) setPaymentDateFrom(urlDateFrom);
    if (paymentDateTo !== urlDateTo) setPaymentDateTo(urlDateTo);
    if (paymentPage !== urlPaymentPage) setPaymentPage(urlPaymentPage);
    if (paymentPageSize !== urlPaymentPageSize) setPaymentPageSize(urlPaymentPageSize);
    if (activeSearch !== urlActiveSearch) setActiveSearch(urlActiveSearch);
    if (activePage !== urlActivePage) setActivePage(urlActivePage);
    if (activePageSize !== urlActivePageSize) setActivePageSize(urlActivePageSize);
    if (unpaidSearch !== urlUnpaidSearch) setUnpaidSearch(urlUnpaidSearch);
    if (unpaidPage !== urlUnpaidPage) setUnpaidPage(urlUnpaidPage);
    if (unpaidPageSize !== urlUnpaidPageSize) setUnpaidPageSize(urlUnpaidPageSize);
  }, [
    activePage,
    activePageSize,
    activeSearch,
    months,
    paymentDateFrom,
    paymentDateTo,
    paymentMemberId,
    paymentMethod,
    paymentPage,
    paymentPageSize,
    searchParams,
    setActivePage,
    setActivePageSize,
    setActiveSearch,
    setMonths,
    setPaymentDateFrom,
    setPaymentDateTo,
    setPaymentMemberId,
    setPaymentMethod,
    setPaymentPage,
    setPaymentPageSize,
    setUnpaidPage,
    setUnpaidPageSize,
    setUnpaidSearch,
    unpaidPage,
    unpaidPageSize,
    unpaidSearch,
  ]);

  const patchParams = useCallback(
    (patcher: (next: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        patcher(next);
        return next;
      });
    },
    [setSearchParams]
  );

  const updateMonths = useCallback(
    (value: AllowedMonths) => {
      setMonths(value);
      patchParams((next) => {
        next.set("months", String(value));
      });
    },
    [patchParams, setMonths]
  );

  const updatePaymentMember = useCallback(
    (value: number | null) => {
      setPaymentMemberId(value);
      setPaymentPage(1);
      patchParams((next) => {
        if (value) next.set("member_id", String(value));
        else next.delete("member_id");
        next.set("payment_page", "1");
      });
    },
    [patchParams, setPaymentMemberId, setPaymentPage]
  );

  const updatePaymentMethod = useCallback(
    (value: PaymentMethodFilter) => {
      setPaymentMethod(value);
      setPaymentPage(1);
      patchParams((next) => {
        if (value === "all") next.delete("payment_method");
        else next.set("payment_method", value);
        next.set("payment_page", "1");
      });
    },
    [patchParams, setPaymentMethod, setPaymentPage]
  );

  const updatePaymentDateFrom = useCallback(
    (value: string) => {
      setPaymentDateFrom(value);
      setPaymentPage(1);
      patchParams((next) => {
        if (value) next.set("date_from", value);
        else next.delete("date_from");
        next.set("payment_page", "1");
      });
    },
    [patchParams, setPaymentDateFrom, setPaymentPage]
  );

  const updatePaymentDateTo = useCallback(
    (value: string) => {
      setPaymentDateTo(value);
      setPaymentPage(1);
      patchParams((next) => {
        if (value) next.set("date_to", value);
        else next.delete("date_to");
        next.set("payment_page", "1");
      });
    },
    [patchParams, setPaymentDateTo, setPaymentPage]
  );

  const updatePaymentPage = useCallback(
    (value: number) => {
      setPaymentPage(value);
      patchParams((next) => {
        next.set("payment_page", String(value));
      });
    },
    [patchParams, setPaymentPage]
  );

  const updateActiveSearch = useCallback(
    (value: string) => {
      setActiveSearch(value);
      setActivePage(1);
      patchParams((next) => {
        if (value.trim()) next.set("active_search", value.trim());
        else next.delete("active_search");
        next.set("active_page", "1");
      });
    },
    [patchParams, setActivePage, setActiveSearch]
  );

  const updateActivePage = useCallback(
    (value: number) => {
      setActivePage(value);
      patchParams((next) => {
        next.set("active_page", String(value));
      });
    },
    [patchParams, setActivePage]
  );

  const updateUnpaidSearch = useCallback(
    (value: string) => {
      setUnpaidSearch(value);
      setUnpaidPage(1);
      patchParams((next) => {
        if (value.trim()) next.set("unpaid_search", value.trim());
        else next.delete("unpaid_search");
        next.set("unpaid_page", "1");
      });
    },
    [patchParams, setUnpaidPage, setUnpaidSearch]
  );

  const updateUnpaidPage = useCallback(
    (value: number) => {
      setUnpaidPage(value);
      patchParams((next) => {
        next.set("unpaid_page", String(value));
      });
    },
    [patchParams, setUnpaidPage]
  );

  const paymentHistoryParams: PaymentHistoryReportParams = {
    member_id: paymentMemberId ?? undefined,
    payment_method: paymentMethod === "all" ? undefined : paymentMethod,
    date_from: paymentDateFrom || undefined,
    date_to: paymentDateTo || undefined,
    page: paymentPage,
    page_size: paymentPageSize,
  };

  const activeMembersParams: ActiveMembersReportParams = {
    search: activeSearch || undefined,
    page: activePage,
    page_size: activePageSize,
  };

  const unpaidMembersParams: UnpaidMembersReportParams = {
    search: unpaidSearch || undefined,
    page: unpaidPage,
    page_size: unpaidPageSize,
  };

  return {
    months,
    paymentMemberId,
    paymentMethod,
    paymentDateFrom,
    paymentDateTo,
    paymentPage,
    paymentPageSize,
    activeSearch,
    activePage,
    activePageSize,
    unpaidSearch,
    unpaidPage,
    unpaidPageSize,
    paymentHistoryParams,
    activeMembersParams,
    unpaidMembersParams,
    updateMonths,
    updatePaymentMember,
    updatePaymentMethod,
    updatePaymentDateFrom,
    updatePaymentDateTo,
    updatePaymentPage,
    updateActiveSearch,
    updateActivePage,
    updateUnpaidSearch,
    updateUnpaidPage,
  };
};

