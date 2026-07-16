import { apiClient } from './client';
import type { ApiResponse, CandidateRankingSort, RecruiterCandidateRanking } from '../types';

export const recruitersApi = {
  getRankedCandidates: async (
    jobId: number,
    sort: CandidateRankingSort = 'overall',
  ): Promise<RecruiterCandidateRanking[]> => {
    const { data } = await apiClient.get<ApiResponse<RecruiterCandidateRanking[]>>(
      `/recruiters/jobs/${jobId}/candidates`,
      { params: { sort } },
    );
    return data.data;
  },
};
