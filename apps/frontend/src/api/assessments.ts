import { apiClient } from './client';
import type { ApiResponse, Assessment, AssessmentQuestion, AssessmentResult } from '../types';

export interface CreateAssessmentPayload {
  targetRole: string;
  skillIds: number[];
}

export interface SubmitAnswerPayload {
  questionId: number;
  candidateAnswer: string;
}

export interface SubmitAssessmentPayload {
  answers: Array<{
    question_id: number;
    candidate_answer: string;
  }>;
}

export const assessmentsApi = {
  create: async (payload: CreateAssessmentPayload): Promise<Assessment & { questions: AssessmentQuestion[] }> => {
    const { data } = await apiClient.post<ApiResponse<Assessment & { questions: AssessmentQuestion[] }>>(
      '/assessments',
      payload,
      { timeout: 180_000 },
    );
    return data.data;
  },

  getById: async (id: number): Promise<Assessment & { questions: AssessmentQuestion[] }> => {
    const { data } = await apiClient.get<ApiResponse<Assessment & { questions: AssessmentQuestion[] }>>(`/assessments/${id}`);
    return data.data;
  },

  listMine: async (): Promise<Assessment[]> => {
    const { data } = await apiClient.get<ApiResponse<Assessment[]>>('/assessments/me');
    return data.data;
  },

  submitAnswer: async (assessmentId: number, payload: SubmitAnswerPayload): Promise<void> => {
    await apiClient.post(`/assessments/${assessmentId}/answers`, payload);
  },

  submitAll: async (assessmentId: number, payload: SubmitAssessmentPayload): Promise<AssessmentResult> => {
    const { data } = await apiClient.post<ApiResponse<AssessmentResult>>(
      `/assessments/${assessmentId}/submit`,
      payload,
      { timeout: 180_000 },
    );
    return data.data;
  },

  getResult: async (assessmentId: number): Promise<AssessmentResult> => {
    const { data } = await apiClient.get<ApiResponse<AssessmentResult>>(`/assessments/${assessmentId}/result`);
    return data.data;
  },
};
