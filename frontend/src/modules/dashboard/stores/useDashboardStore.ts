import { create } from "zustand";

import type { AllowedMonths } from "../types/dashboard";

interface DashboardStoreState {
  months: AllowedMonths;
  activityLimit: number;
  alertsLimit: number;
  setMonths: (months: AllowedMonths) => void;
  setActivityLimit: (limit: number) => void;
  setAlertsLimit: (limit: number) => void;
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  months: 12,
  activityLimit: 5,
  alertsLimit: 5,
  setMonths: (months) => set({ months }),
  setActivityLimit: (activityLimit) => set({ activityLimit }),
  setAlertsLimit: (alertsLimit) => set({ alertsLimit }),
}));
