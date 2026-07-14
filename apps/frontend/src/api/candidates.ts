import { apiClient } from './client';
import type {
  ApiResponse,
  CandidateJobRecommendations,
  CandidateProfile,
  CandidateSkill,
  ResumeUploadResult,
} from '../types';

export const candidatesApi = {
  getProfile: async (): Promise<CandidateProfile> => {
    const { data } = await apiClient.get<ApiResponse<CandidateProfile>>('/candidates/me');
    return data.data;
  },

  updateProfile: async (payload: Partial<Pick<CandidateProfile, 'targetRole'>>): Promise<CandidateProfile> => {
    const { data } = await apiClient.patch<ApiResponse<CandidateProfile>>('/candidates/me', payload);
    return data.data;
  },

  uploadResume: async (file: File): Promise<ResumeUploadResult> => {
    const form = new FormData();
    form.append('resume', file);
    const { data } = await apiClient.post<ApiResponse<ResumeUploadResult>>('/candidates/me/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180_000,
    });
    return data.data;
  },

  getSkills: async (): Promise<CandidateSkill[]> => {
    const { data } = await apiClient.get<ApiResponse<CandidateSkill[]>>('/candidates/me/skills');
    return data.data;
  },

  confirmSkills: async (skillIds: number[]): Promise<CandidateSkill[]> => {
    const { data } = await apiClient.post<ApiResponse<CandidateSkill[]>>('/candidates/me/skills/confirm', { skillIds });
    return data.data;
  },

  getJobRecommendations: async (): Promise<CandidateJobRecommendations> => {
    const { data } = await apiClient.get<ApiResponse<CandidateJobRecommendations>>('/candidates/me/job-recommendations');
    return data.data;
  },
};
