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
  withCredentials: true,
});

// --- Response interceptor: handle 401 globally ---
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // AuthProvider handles the startup /auth/me check without a redirect.
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
