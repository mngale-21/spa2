// ============================================================================
// API Client
// Thin axios wrapper that attaches the JWT (from localStorage) to every
// request and centralizes the backend base URL.
// ============================================================================

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("salon_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 503 &&
      error?.response?.data?.code === "SERVICE_SUSPENDED" &&
      window.location.pathname !== "/service-suspended"
    ) {
      // The Admin System has suspended this company's subscription — carry
      // the human-readable reason across the redirect (there's no longer a
      // public /platform/status endpoint to fetch it from afterwards) and
      // send everyone straight to the explanation screen.
      sessionStorage.setItem(
        "salon_suspended_reason",
        error.response.data.message || ""
      );
      window.location.href = "/service-suspended";
    }
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      // Token expired or invalid — clear it and send the user back to sign
      // in, rather than letting every caller's request crash the page.
      // Guarded so we don't force-redirect a wrong-password attempt made
      // from the login page itself.
      localStorage.removeItem("salon_token");
      localStorage.removeItem("salon_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
