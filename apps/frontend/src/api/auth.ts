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
  token: string;
  user: User;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload);
    return data.data;
  },

  logout: () => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
  },
};
