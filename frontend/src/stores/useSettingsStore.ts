import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { apiClient } from "../lib/api";
import type {
  EmailSettings,
  LogoSettings,
  Setting,
  ShopSettings,
} from "../entities/Setting";

interface SettingsState {
  // Data
  shopSettings: ShopSettings | null;
  emailSettings: EmailSettings | null;
  logoSettings: LogoSettings | null;

  // Loading states
  isLoadingShop: boolean;
  isLoadingEmail: boolean;
  isLoadingLogo: boolean;

  // Saving states
  isSavingShop: boolean;
  isSavingEmail: boolean;
  isSavingLogo: boolean;

  // Actions
  setSettings: (setting: Setting) => void;
  fetchShopSettings: () => Promise<void>;
  fetchEmailSettings: () => Promise<void>;
  fetchLogoSettings: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateShopSettings: (data: ShopSettings) => Promise<void>;
  updateEmailSettings: (data: EmailSettings) => Promise<void>;
  updateLogoSettings: (file: File) => Promise<void>;
  testEmailConfiguration: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      shopSettings: null,
      emailSettings: null,
      logoSettings: null,
      isLoadingShop: false,
      isLoadingEmail: false,
      isLoadingLogo: false,
      isSavingShop: false,
      isSavingEmail: false,
      isSavingLogo: false,

      setSettings({ shop_settings, logo_settings, email_settings }) {
        set({
          shopSettings: shop_settings,
          emailSettings: email_settings,
          logoSettings: logo_settings,
        });
      },
      // Fetch shop settings
      fetchShopSettings: async () => {
        set({ isLoadingShop: true });
        try {
          const response = await apiClient.get("/settings/gym-profile/");
          set({
            shopSettings: {
              shop_name: response.data.gym_name || "",
              phone_number: response.data.phone_number || "",
              contact_email: response.data.email || "",
              address: response.data.address || "",
            },
            isLoadingShop: false,
          });
        } catch (error) {
          set({ isLoadingShop: false });
          throw error;
        }
      },

      // Fetch email settings
      fetchEmailSettings: async () => {
        set({ isLoadingEmail: true });
        try {
          const response = await apiClient.get("/settings/notifications/");
          set({
            emailSettings: {
              smtp_host: response.data.smtp_host || "",
              smtp_port: response.data.smtp_port || 587,
              smtp_username: response.data.smtp_username || "",
              smtp_password: "",
              from_email: response.data.from_email || "",
            },
            isLoadingEmail: false,
          });
        } catch (error) {
          set({ isLoadingEmail: false });
          throw error;
        }
      },

      // Fetch logo settings
      fetchLogoSettings: async () => {
        set({ isLoadingLogo: true });
        try {
          const response = await apiClient.get("/settings/gym-profile/");
          set({
            logoSettings: { logo: response.data.gym_logo_url ?? null },
            isLoadingLogo: false,
          });
        } catch (error) {
          set({ isLoadingLogo: false });
          throw error;
        }
      },
      fetchSettings() {
        const { fetchShopSettings, fetchLogoSettings, fetchEmailSettings } =
          get();
        return Promise.all([
          fetchShopSettings(),
          fetchLogoSettings(),
          fetchEmailSettings(),
        ]);
      },

      // Update shop settings
      updateShopSettings: async (data: ShopSettings) => {
        set({ isSavingShop: true });
        try {
          const existing = await apiClient.get("/settings/gym-profile/");
          const payload = {
            gym_name: data.shop_name,
            address: data.address,
            phone_number: data.phone_number,
            email: data.contact_email,
            website: existing.data.website || "",
            working_hours_json: existing.data.working_hours_json || {},
            description: existing.data.description || "",
          };
          await apiClient.put("/settings/gym-profile/", payload);
          set({ shopSettings: data, isSavingShop: false });
        } catch (error) {
          set({ isSavingShop: false });
          throw error;
        }
      },

      // Update email settings
      updateEmailSettings: async (data: EmailSettings) => {
        set({ isSavingEmail: true });
        try {
          const existing = await apiClient.get("/settings/notifications/");
          const payload = {
            ...existing.data,
            smtp_host: data.smtp_host,
            smtp_port: data.smtp_port,
            smtp_username: data.smtp_username,
            smtp_password: data.smtp_password || "",
            from_email: data.from_email,
          };
          await apiClient.put("/settings/notifications/", payload);
          set({ emailSettings: data, isSavingEmail: false });
        } catch (error) {
          set({ isSavingEmail: false });
          throw error;
        }
      },

      // Update logo settings
      updateLogoSettings: async (file: File) => {
        set({ isSavingLogo: true });
        try {
          const formData = new FormData();
          formData.append("gym_logo", file);

          const response = await apiClient.post("/settings/gym-profile/logo/", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          set({
            logoSettings: { logo: response.data.gym_logo_url ?? null },
            isSavingLogo: false,
          });
        } catch (error) {
          set({ isSavingLogo: false });
          throw error;
        }
      },

      // Test email configuration
      testEmailConfiguration: async () => {
        await apiClient.post("/settings/notifications/test-email/");
      },
    }),
    {
      name: "settings-store",
    }
  )
);
