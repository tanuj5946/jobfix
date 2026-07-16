import { apiClient } from './client';
import type { ApiResponse, Company } from '../types';

export interface CompanyPayload {
  name: string;
  website?: string | null;
  industry?: string | null;
}

export const companiesApi = {
  getMine: async (): Promise<Company> => {
    const { data } = await apiClient.get<ApiResponse<Company>>('/companies/me');
    return data.data;
  },

  create: async (payload: CompanyPayload): Promise<Company> => {
    const { data } = await apiClient.post<ApiResponse<Company>>('/companies', payload);
    return data.data;
  },

  updateMine: async (payload: Partial<CompanyPayload>): Promise<Company> => {
    const { data } = await apiClient.patch<ApiResponse<Company>>('/companies/me', payload);
    return data.data;
  },

  deleteMine: async (): Promise<void> => {
    await apiClient.delete('/companies/me');
  },
};
