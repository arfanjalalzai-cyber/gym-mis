import apiClient from "@/lib/api";

import {
  dashboardActivityResponseSchema,
  dashboardAlertsResponseSchema,
  dashboardOverviewResponseSchema,
} from "../schemas/dashboardSchemas";
import type {
  AllowedMonths,
  DashboardActivityResponse,
  DashboardAlertsResponse,
  DashboardOverviewResponse,
} from "../types/dashboard";

export const dashboardService = {
  getOverview: async (months: AllowedMonths): Promise<DashboardOverviewResponse> => {
    const response = await apiClient.get<DashboardOverviewResponse>(
      "/reports/dashboard/overview/",
      { params: { months } }
    );
    return dashboardOverviewResponseSchema.parse(response.data);
  },

  getActivity: async (limit = 5): Promise<DashboardActivityResponse> => {
    const response = await apiClient.get<DashboardActivityResponse>(
      "/reports/dashboard/activity/",
      { params: { limit } }
    );
    return dashboardActivityResponseSchema.parse(response.data);
  },

  getAlerts: async (limit = 5): Promise<DashboardAlertsResponse> => {
    const response = await apiClient.get<DashboardAlertsResponse>(
      "/reports/dashboard/alerts/",
      { params: { limit } }
    );
    return dashboardAlertsResponseSchema.parse(response.data);
  },
};
