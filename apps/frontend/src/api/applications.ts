import { apiClient } from './client';
import type { ApiResponse, Application } from '../types';

export const applicationsApi = {
  apply: async (jobId: number): Promise<Application> => {
    const { data } = await apiClient.post<ApiResponse<Application>>(`/applications/jobs/${jobId}`);
    return data.data;
  },

  listMine: async (): Promise<Application[]> => {
    const { data } = await apiClient.get<ApiResponse<Application[]>>('/applications/me');
    return data.data;
  },
};
