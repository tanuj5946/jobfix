import { apiClient } from './client';
import type { ApiResponse, LearningRecommendation } from '../types';

export const careerCoachApi = {
  getImprovementPlan: async (): Promise<LearningRecommendation[]> => {
    const { data } = await apiClient.get<ApiResponse<LearningRecommendation[]>>('/career-coach/plan');
    return data.data;
  },

  markComplete: async (recommendationId: number): Promise<LearningRecommendation> => {
    const { data } = await apiClient.patch<ApiResponse<LearningRecommendation>>(
      `/career-coach/plan/${recommendationId}/complete`,
    );
    return data.data;
  },
};
