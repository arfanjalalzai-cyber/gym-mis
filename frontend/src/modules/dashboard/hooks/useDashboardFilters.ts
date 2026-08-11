import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useDashboardStore } from "../stores/useDashboardStore";
import type { AllowedMonths } from "../types/dashboard";

const VALID_MONTHS: AllowedMonths[] = [6, 12, 24];

const parseMonths = (value: string | null): AllowedMonths => {
  const parsed = Number(value);
  return VALID_MONTHS.includes(parsed as AllowedMonths)
    ? (parsed as AllowedMonths)
    : 12;
};

export const useDashboardFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    months,
    activityLimit,
    alertsLimit,
    setMonths,
    setActivityLimit,
    setAlertsLimit,
  } = useDashboardStore();

  useEffect(() => {
    const urlMonths = parseMonths(searchParams.get("months"));
    if (months !== urlMonths) {
      setMonths(urlMonths);
    }
  }, [months, searchParams, setMonths]);

  const updateMonths = useCallback(
    (value: AllowedMonths) => {
      setMonths(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("months", String(value));
        return next;
      });
    },
    [setMonths, setSearchParams]
  );

  return {
    months,
    activityLimit,
    alertsLimit,
    updateMonths,
    setActivityLimit,
    setAlertsLimit,
  };
};
