import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsSectionKey =
  | "overview"
  | "gym-information"
  | "user-role-management"
  | "membership-plans"
  | "payment-billing"
  | "security"
  | "system-preferences"
  | "backup-maintenance";

interface SettingsUiState {
  activeSection: SettingsSectionKey;
  isCreateUserModalOpen: boolean;
  isCreatePlanModalOpen: boolean;
  hasUnsavedChanges: boolean;
  setActiveSection: (section: SettingsSectionKey) => void;
  setCreateUserModalOpen: (open: boolean) => void;
  setCreatePlanModalOpen: (open: boolean) => void;
  setUnsavedChanges: (dirty: boolean) => void;
}

export const useSettingsUiStore = create<SettingsUiState>()(
  persist(
    (set) => ({
      activeSection: "overview",
      isCreateUserModalOpen: false,
      isCreatePlanModalOpen: false,
      hasUnsavedChanges: false,
      setActiveSection: (section) => set({ activeSection: section }),
      setCreateUserModalOpen: (open) => set({ isCreateUserModalOpen: open }),
      setCreatePlanModalOpen: (open) => set({ isCreatePlanModalOpen: open }),
      setUnsavedChanges: (dirty) => set({ hasUnsavedChanges: dirty }),
    }),
    {
      name: "settings-ui-store",
      partialize: (state) => ({ activeSection: state.activeSection }),
    }
  )
);

export type { SettingsSectionKey };
