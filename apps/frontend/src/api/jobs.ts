import { apiClient } from './client';
import type { ApiResponse, Job, PaginatedResponse } from '../types';

export interface CreateJobPayload {
  title: string;
  description?: string;
  location?: string;
  workMode?: Job['workMode'];
  experienceLevel?: Job['experienceLevel'];
  minVerifiedLevel?: Job['minVerifiedLevel'];
  requiredSkills: Array<{ skillId: number; importance: 'high' | 'medium' | 'low' }>;
}

export interface ListJobsParams {
  status?: Job['status'];
  search?: string;
  page?: number;
  limit?: number;
}

export const jobsApi = {
  list: async (params?: ListJobsParams): Promise<PaginatedResponse<Job>> => {
    const { data } = await apiClient.get<PaginatedResponse<Job>>('/jobs', { params });
    return data;
  },

  getById: async (id: number): Promise<Job> => {
    const { data } = await apiClient.get<ApiResponse<Job>>(`/jobs/${id}`);
    return data.data;
  },

  create: async (payload: CreateJobPayload): Promise<Job> => {
    const { data } = await apiClient.post<ApiResponse<Job>>('/jobs', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CreateJobPayload & { status: Job['status'] }>): Promise<Job> => {
    const { data } = await apiClient.patch<ApiResponse<Job>>(`/jobs/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/jobs/${id}`);
  },

  publish: async (id: number): Promise<Job> => {
    const { data } = await apiClient.post<ApiResponse<Job>>(`/jobs/${id}/publish`);
    return data.data;
  },

  close: async (id: number): Promise<Job> => {
    const { data } = await apiClient.post<ApiResponse<Job>>(`/jobs/${id}/close`);
    return data.data;
  },
};
