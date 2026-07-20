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


  sendPreRegistrationVerification: async (
    payload: RegisterPayload,
  ): Promise<{ message: string; verificationToken: string }> => {
    const { data } = await apiClient.post<{
      success: boolean;
      message: string;
      verificationToken: string;
    }>('/auth/send-pre-registration-verification', payload);
    return { message: data.message, verificationToken: data.verificationToken };
  },

  /**
   * Step 2 (polling) — returns { verified: true } once the user
   * has clicked the link in their inbox.
   */
  checkPreRegistrationToken: async (token: string): Promise<{ verified: boolean }> => {
    const { data } = await apiClient.get<{ success: boolean; verified: boolean }>(
      '/auth/check-pre-registration-token',
      { params: { token } },
    );
    return { verified: data.verified };
  },

  /**
   * Step 3 — creates the user account.
   * Backend requires a verified pending entry; does NOT auto-login.
   */
  register: async (payload: RegisterPayload): Promise<{ user: User; message: string }> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse> & { message: string }>('/auth/register', payload);
    return { user: data.data.user, message: data.message ?? '' };
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string; pendingRegistration?: boolean }> => {
    const { data } = await apiClient.get<{ success: boolean; message: string; pendingRegistration?: boolean }>(
      '/auth/verify-email',
      { params: { token } },
    );
    return { message: data.message, pendingRegistration: data.pendingRegistration };
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
