import axios from "axios";

const defaultBaseUrl = import.meta.env.PROD 
  ? "https://white-account-backend.onrender.com/api" 
  : "http://localhost:5000/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("white_account_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;