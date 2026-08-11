import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useStaffStore,
  type StaffEmploymentStatusFilter,
  type StaffPositionFilter,
  type StaffSalaryStatusFilter,
} from "../stores/useStaffStore";
import type { StaffListParams } from "../types/staff";

const VALID_POSITION: StaffPositionFilter[] = ["all", "trainer", "manager", "cleaner", "other"];
const VALID_EMPLOYMENT_STATUS: StaffEmploymentStatusFilter[] = [
  "all",
  "active",
  "inactive",
  "on_leave",
  "resigned",
];
const VALID_SALARY_STATUS: StaffSalaryStatusFilter[] = ["all", "paid", "unpaid", "partial"];

const parseIntOrDefault = (value: string | null, defaultValue: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const useStaffFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    search,
    position,
    employment_status,
    salary_status,
    page,
    page_size,
    setSearch,
    setPosition,
    setEmploymentStatus,
    setSalaryStatus,
    setPage,
    setPageSize,
  } = useStaffStore();

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlPosition = searchParams.get("position") ?? "all";
    const urlEmploymentStatus = searchParams.get("employment_status") ?? "all";
    const urlSalaryStatus = searchParams.get("salary_status") ?? "all";
    const urlPage = parseIntOrDefault(searchParams.get("page"), 1);
    const urlPageSize = parseIntOrDefault(searchParams.get("page_size"), 25);

    const normalizedPosition = VALID_POSITION.includes(urlPosition as StaffPositionFilter)
      ? (urlPosition as StaffPositionFilter)
      : "all";
    const normalizedEmploymentStatus = VALID_EMPLOYMENT_STATUS.includes(
      urlEmploymentStatus as StaffEmploymentStatusFilter
    )
      ? (urlEmploymentStatus as StaffEmploymentStatusFilter)
      : "all";
    const normalizedSalaryStatus = VALID_SALARY_STATUS.includes(
      urlSalaryStatus as StaffSalaryStatusFilter
    )
      ? (urlSalaryStatus as StaffSalaryStatusFilter)
      : "all";

    if (search !== urlSearch) setSearch(urlSearch);
    if (position !== normalizedPosition) setPosition(normalizedPosition);
    if (employment_status !== normalizedEmploymentStatus) {
      setEmploymentStatus(normalizedEmploymentStatus);
    }
    if (salary_status !== normalizedSalaryStatus) {
      setSalaryStatus(normalizedSalaryStatus);
    }
    if (page !== urlPage) setPage(urlPage);
    if (page_size !== urlPageSize) setPageSize(urlPageSize);
  }, [
    employment_status,
    page,
    page_size,
    position,
    salary_status,
    search,
    searchParams,
    setEmploymentStatus,
    setPage,
    setPageSize,
    setPosition,
    setSalaryStatus,
    setSearch,
  ]);

  const updateSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) {
          next.set("search", value.trim());
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        return next;
      });
    },
    [setPage, setSearch, setSearchParams]
  );

  const updatePosition = useCallback(
    (value: StaffPositionFilter) => {
      setPosition(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("position");
        } else {
          next.set("position", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setPage, setPosition, setSearchParams]
  );

  const updateEmploymentStatus = useCallback(
    (value: StaffEmploymentStatusFilter) => {
      setEmploymentStatus(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("employment_status");
        } else {
          next.set("employment_status", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setEmploymentStatus, setPage, setSearchParams]
  );

  const updateSalaryStatus = useCallback(
    (value: StaffSalaryStatusFilter) => {
      setSalaryStatus(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("salary_status");
        } else {
          next.set("salary_status", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setPage, setSalaryStatus, setSearchParams]
  );

  const updatePage = useCallback(
    (value: number) => {
      setPage(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(value));
        return next;
      });
    },
    [setPage, setSearchParams]
  );

  const listParams: StaffListParams = {
    page,
    page_size,
    search: search || undefined,
    position: position === "all" ? undefined : position,
    employment_status: employment_status === "all" ? undefined : employment_status,
    salary_status: salary_status === "all" ? undefined : salary_status,
  };

  return {
    search,
    position,
    employment_status,
    salary_status,
    page,
    page_size,
    listParams,
    updateSearch,
    updatePosition,
    updateEmploymentStatus,
    updateSalaryStatus,
    updatePage,
  };
};
