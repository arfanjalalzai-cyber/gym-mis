import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "../services/dashboardService";
import type { AllowedMonths } from "../types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (months: AllowedMonths) =>
    [...dashboardKeys.all, "overview", months] as const,
  activity: (limit: number) => [...dashboardKeys.all, "activity", limit] as const,
  alerts: (limit: number) => [...dashboardKeys.all, "alerts", limit] as const,
};

export const useDashboardOverview = (months: AllowedMonths, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.overview(months),
    queryFn: () => dashboardService.getOverview(months),
    enabled,
  });

export const useDashboardActivity = (limit = 5, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.activity(limit),
    queryFn: () => dashboardService.getActivity(limit),
    enabled,
  });

export const useDashboardAlerts = (limit = 5, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.alerts(limit),
    queryFn: () => dashboardService.getAlerts(limit),
    enabled,
  });
