// src/utils/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Central axios instance with automatic token injection and 401/403 handling.
// Import this instead of plain axios everywhere you need authenticated requests.
//
// Usage:
//   import api from '../utils/api';
//   const { data } = await api.post('/api/checkout', payload);
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

const BASE_URL = window.location.origin;

const api = axios.create({ baseURL: BASE_URL });

// ── Request interceptor: attach the latest token from localStorage ───────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 / 403 globally ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      // Token is missing, expired or invalid — clear session and force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('cart');

      // Dispatch a custom event so App.jsx can update its state
      window.dispatchEvent(new CustomEvent('auth:expired'));

      // Replace current history entry so back-button doesn't bring them back
      window.location.replace('/auth');
    }

    return Promise.reject(error);
  }
);

export default api;
