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

export const useDashboardOverview = (months: AllowedMonths) =>
  useQuery({
    queryKey: dashboardKeys.overview(months),
    queryFn: () => dashboardService.getOverview(months),
  });

export const useDashboardActivity = (limit = 5) =>
  useQuery({
    queryKey: dashboardKeys.activity(limit),
    queryFn: () => dashboardService.getActivity(limit),
  });

export const useDashboardAlerts = (limit = 5) =>
  useQuery({
    queryKey: dashboardKeys.alerts(limit),
    queryFn: () => dashboardService.getAlerts(limit),
  });
