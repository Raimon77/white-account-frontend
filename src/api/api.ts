import axios from "axios";

import {
  expireAuthSession,
  getAuthToken,
  isTokenExpired,
} from "@/auth/session";

const defaultBaseUrl = import.meta.env.PROD 
  ? "https://white-account-backend.onrender.com/api" 
  : "http://localhost:5000/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    if (isTokenExpired(token)) {
      expireAuthSession();
      return Promise.reject(new axios.CanceledError("Session expirée"));
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const requestUrl = error.config?.url || "";
      const isPublicAuthRequest = [
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
      ].some((path) => requestUrl.includes(path));

      if (
        error.response?.status === 401 &&
        getAuthToken() &&
        !isPublicAuthRequest
      ) {
        expireAuthSession();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
