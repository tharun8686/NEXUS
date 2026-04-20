// src/utils/api.js

import axios from 'axios';

// ✅ Vercel uses same origin
const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

const api = axios.create({
  baseURL: BASE_URL,
});

// attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle auth errors
api.interceptors.response.use(
  res => res,
  err => {
    if ([401, 403].includes(err.response?.status)) {
      localStorage.clear();
      window.location.replace("/auth");
    }
    return Promise.reject(err);
  }
);

export default api;