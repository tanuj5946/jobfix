import axios from 'axios';

// ============================================================
// Axios instance — single configurable base URL → core-service
// The frontend NEVER calls ai-service directly.
// All AI-related operations go through core-service, which
// internally forwards to ai-service.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// --- Request interceptor: attach JWT from localStorage ---
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: handle 401 globally ---
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
