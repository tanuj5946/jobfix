import { apiClient } from './client';
import type { ApiResponse, JobMatch } from '../types';

export const matchesApi = {
  /** Recruiter: get ranked candidate list for a job */
  getForJob: async (jobId: number): Promise<JobMatch[]> => {
    const { data } = await apiClient.get<ApiResponse<JobMatch[]>>(`/matches/job/${jobId}`);
    return data.data;
  },

  /** Trigger AI match computation for a job (recruiter action) */
  runMatch: async (jobId: number): Promise<{ queued: boolean }> => {
    const { data } = await apiClient.post<ApiResponse<{ queued: boolean }>>(`/matches/job/${jobId}/run`);
    return data.data;
  },
};
