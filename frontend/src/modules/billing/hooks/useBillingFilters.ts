import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useBillingStore, type BillStatusFilter } from "../stores/useBillingStore";
import type { BillListParams } from "../types/billing";

const VALID_STATUS: BillStatusFilter[] = ["all", "unpaid", "partial", "paid"];

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

export const useBillingFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    search,
    selectedMemberId,
    status,
    billingDateFrom,
    billingDateTo,
    page,
    page_size,
    setSearch,
    setSelectedMemberId,
    setStatus,
    setBillingDateFrom,
    setBillingDateTo,
    setPage,
    setPageSize,
  } = useBillingStore();

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlMemberId = parseIntOrNull(searchParams.get("member_id"));
    const urlStatusRaw = searchParams.get("status") ?? "all";
    const urlStatus = VALID_STATUS.includes(urlStatusRaw as BillStatusFilter)
      ? (urlStatusRaw as BillStatusFilter)
      : "all";
    const urlFrom = searchParams.get("billing_date_from") ?? "";
    const urlTo = searchParams.get("billing_date_to") ?? "";
    const urlPage = parseIntOrDefault(searchParams.get("page"), 1);
    const urlPageSize = parseIntOrDefault(searchParams.get("page_size"), 25);

    if (search !== urlSearch) setSearch(urlSearch);
    if (selectedMemberId !== urlMemberId) setSelectedMemberId(urlMemberId);
    if (status !== urlStatus) setStatus(urlStatus);
    if (billingDateFrom !== urlFrom) setBillingDateFrom(urlFrom);
    if (billingDateTo !== urlTo) setBillingDateTo(urlTo);
    if (page !== urlPage) setPage(urlPage);
    if (page_size !== urlPageSize) setPageSize(urlPageSize);
  }, [
    billingDateFrom,
    billingDateTo,
    page,
    page_size,
    search,
    searchParams,
    selectedMemberId,
    setBillingDateFrom,
    setBillingDateTo,
    setPage,
    setPageSize,
    setSearch,
    setSelectedMemberId,
    setStatus,
    status,
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

  const updateSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value.trim()) next.set("search", value.trim());
        else next.delete("search");
        next.set("page", "1");
      });
    },
    [setPage, setSearch, updateSearchParams]
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

  const updateStatus = useCallback(
    (value: BillStatusFilter) => {
      setStatus(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value === "all") next.delete("status");
        else next.set("status", value);
        next.set("page", "1");
      });
    },
    [setPage, setStatus, updateSearchParams]
  );

  const updateDateFrom = useCallback(
    (value: string) => {
      setBillingDateFrom(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("billing_date_from", value);
        else next.delete("billing_date_from");
        next.set("page", "1");
      });
    },
    [setBillingDateFrom, setPage, updateSearchParams]
  );

  const updateDateTo = useCallback(
    (value: string) => {
      setBillingDateTo(value);
      setPage(1);
      updateSearchParams((next) => {
        if (value) next.set("billing_date_to", value);
        else next.delete("billing_date_to");
        next.set("page", "1");
      });
    },
    [setBillingDateTo, setPage, updateSearchParams]
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

  const listParams: BillListParams = {
    search: search || undefined,
    member_id: selectedMemberId ?? undefined,
    status: status === "all" ? undefined : status,
    billing_date_from: billingDateFrom || undefined,
    billing_date_to: billingDateTo || undefined,
    page,
    page_size,
  };

  return {
    search,
    selectedMemberId,
    status,
    billingDateFrom,
    billingDateTo,
    page,
    page_size,
    listParams,
    updateSearch,
    updateMember,
    updateStatus,
    updateDateFrom,
    updateDateTo,
    updatePage,
  };
};

