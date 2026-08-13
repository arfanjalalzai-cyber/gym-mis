// MIS API Client
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useUserStore } from "@/modules/auth/stores/useUserStore";
import { getCSRFToken } from "@/utils/csrf";

// --- Helper Functions for Token Management ---

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem("accessToken");
};

export const setAccessToken = (token: string): void => {
  sessionStorage.setItem("accessToken", token);
};

export const clearAccessToken = (): void => {
  sessionStorage.removeItem("accessToken");
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Railway/database-backed uploads can take longer than a normal JSON request,
  // particularly right after a deployment. Keep a reasonable upload window.
  timeout: 60_000,
  withCredentials: true,
});

// Request interceptor for adding auth tokens or other headers
apiClient.interceptors.request.use(
  async (config) => {
    // Let the browser set multipart boundaries for FormData payloads.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete (config.headers as Record<string, unknown>)["Content-Type"];
      delete (config.headers as Record<string, unknown>)["content-type"];
    }

    // JWT Token
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF token handling
    const csrfToken = getCSRFToken();
    if (csrfToken && config.method !== "get") {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (error.response?.status === 401) {
      if (isRefreshing) {
        // If we are already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/accounts/token/refresh/`,
          {},
          { withCredentials: true }
        );

        // Refresh successful
        setAccessToken(data.access);
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${data.access}`;

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, log the user out
        clearAccessToken();
        useUserStore.getState().logout();

        // Redirect to MIS login page
        window.location.href = "/auth/login";

        processQueue(refreshError as AxiosError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
