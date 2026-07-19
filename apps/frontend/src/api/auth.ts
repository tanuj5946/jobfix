import { apiClient } from './client';
import type { ApiResponse, User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'candidate' | 'recruiter';
  companyName?: string; // required if role === 'recruiter'
}

export interface AuthResponse {
  user: User;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    return data.data;
  },

  loginRecruiter: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/recruiter/login', payload);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload);
    return data.data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  verifyEmail: async (token: string): Promise<string> => {
    const { data } = await apiClient.get<{ success: boolean; message: string }>('/auth/verify-email', {
      params: { token },
    });
    return data.message;
  },

  forgotPassword: async (email: string): Promise<string> => {
    const { data } = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
    return data.message;
  },

  validatePasswordResetToken: async (token: string): Promise<string> => {
    const { data } = await apiClient.get<{ success: boolean; message: string }>('/auth/reset-password', {
      params: { token },
    });
    return data.message;
  },

  resetPassword: async (token: string, password: string): Promise<string> => {
    const { data } = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', {
      token,
      password,
    });
    return data.message;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
