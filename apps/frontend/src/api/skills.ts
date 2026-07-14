import { apiClient } from './client';
import type { ApiResponse, Skill, PaginatedResponse } from '../types';

export const skillsApi = {
  list: async (params?: { search?: string; category?: string }): Promise<PaginatedResponse<Skill>> => {
    const { data } = await apiClient.get<PaginatedResponse<Skill>>('/skills', { params });
    return data;
  },

  getById: async (id: number): Promise<Skill> => {
    const { data } = await apiClient.get<ApiResponse<Skill>>(`/skills/${id}`);
    return data.data;
  },
};
