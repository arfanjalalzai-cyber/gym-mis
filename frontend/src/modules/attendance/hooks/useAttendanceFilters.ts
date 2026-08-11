import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useAttendanceStore,
  type AttendanceStatusFilter,
} from "../stores/useAttendanceStore";
import type { AttendanceMonthlyReportParams } from "../types/attendance";

const VALID_STATUS: AttendanceStatusFilter[] = [
  "all",
  "present",
  "absent",
  "late",
  "leave",
];

const parseIntOrNull = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseIntOrDefault = (value: string | null, defaultValue: number) => {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

const getTodayInKabul = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const useAttendanceFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedDate,
    reportMonth,
    selectedStaffId,
    search,
    status,
    page,
    page_size,
    setSelectedDate,
    setReportMonth,
    setSelectedStaffId,
    setSearch,
    setStatus,
    setPage,
    setPageSize,
  } = useAttendanceStore();

  useEffect(() => {
    const date = searchParams.get("date") ?? getTodayInKabul();
    const month = searchParams.get("month") ?? date.slice(0, 7);
    const staffId = parseIntOrNull(searchParams.get("staff_id"));
    const query = searchParams.get("search") ?? "";
    const statusValue = searchParams.get("status") ?? "all";
    const nextStatus = VALID_STATUS.includes(statusValue as AttendanceStatusFilter)
      ? (statusValue as AttendanceStatusFilter)
      : "all";
    const nextPage = parseIntOrDefault(searchParams.get("page"), 1);
    const nextPageSize = parseIntOrDefault(searchParams.get("page_size"), 25);

    if (selectedDate !== date) setSelectedDate(date);
    if (reportMonth !== month) setReportMonth(month);
    if (selectedStaffId !== staffId) setSelectedStaffId(staffId);
    if (search !== query) setSearch(query);
    if (status !== nextStatus) setStatus(nextStatus);
    if (page !== nextPage) setPage(nextPage);
    if (page_size !== nextPageSize) setPageSize(nextPageSize);
  }, [
    page,
    page_size,
    reportMonth,
    search,
    searchParams,
    selectedDate,
    selectedStaffId,
    setPage,
    setPageSize,
    setReportMonth,
    setSearch,
    setSelectedDate,
    setSelectedStaffId,
    setStatus,
    status,
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

  const updateDate = useCallback(
    (value: string) => {
      setSelectedDate(value);
      setPage(1);
      patchParams((next) => {
        next.set("date", value);
        if (!next.get("month")) {
          next.set("month", value.slice(0, 7));
        }
        next.set("page", "1");
      });
    },
    [patchParams, setPage, setSelectedDate]
  );

  const updateReportMonth = useCallback(
    (value: string) => {
      setReportMonth(value);
      setPage(1);
      patchParams((next) => {
        next.set("month", value);
        next.set("page", "1");
      });
    },
    [patchParams, setPage, setReportMonth]
  );

  const updateSelectedStaffId = useCallback(
    (value: number | null) => {
      setSelectedStaffId(value);
      setPage(1);
      patchParams((next) => {
        if (value) next.set("staff_id", String(value));
        else next.delete("staff_id");
        next.set("page", "1");
      });
    },
    [patchParams, setPage, setSelectedStaffId]
  );

  const updateSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      patchParams((next) => {
        if (value.trim()) next.set("search", value.trim());
        else next.delete("search");
        next.set("page", "1");
      });
    },
    [patchParams, setPage, setSearch]
  );

  const updateStatus = useCallback(
    (value: AttendanceStatusFilter) => {
      setStatus(value);
      setPage(1);
      patchParams((next) => {
        if (value === "all") next.delete("status");
        else next.set("status", value);
        next.set("page", "1");
      });
    },
    [patchParams, setPage, setStatus]
  );

  const updatePage = useCallback(
    (value: number) => {
      setPage(value);
      patchParams((next) => {
        next.set("page", String(value));
      });
    },
    [patchParams, setPage]
  );

  const monthlyReportParams: AttendanceMonthlyReportParams = {
    month: reportMonth || undefined,
    staff_id: selectedStaffId ?? undefined,
    search: search || undefined,
    page,
    page_size,
  };

  return {
    selectedDate,
    reportMonth,
    selectedStaffId,
    search,
    status,
    page,
    page_size,
    monthlyReportParams,
    updateDate,
    updateReportMonth,
    updateSelectedStaffId,
    updateSearch,
    updateStatus,
    updatePage,
  };
};

