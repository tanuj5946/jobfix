import { apiClient } from './client';
import type { ApiResponse, Skill, User } from '../types';

export interface AdminUser extends User {
  candidateProfile?: {
    id: number;
    targetRole: string | null;
    candidateSkills: Array<{ skill: Skill; verifiedLevel: string | null }>;
    assessments: Array<{ id: number; status: string; createdAt: string }>;
  } | null;
  recruiterProfile?: {
    id: number;
    companyName: string;
    companyWebsite: string | null;
    industry: string | null;
    jobs: Array<{ id: number; title: string; status: string; requiredSkills: Array<{ skill: Skill }> }>;
  } | null;
}

export interface QuestionSeedResult {
  role: string;
  generated: number;
  stored: number;
  failed: number;
  results: Array<{ skill: string; generated: number; stored: number; failed: number }>;
}

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => {
    const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users');
    return data.data;
  },
  seedQuestions: async (payload: { role: string; skillIds: number[]; countPerSkill: number }): Promise<QuestionSeedResult> => {
    const { data } = await apiClient.post<ApiResponse<QuestionSeedResult>>(
      '/admin/questions/seed',
      payload,
      { timeout: 600_000 },
    );
    return data.data;
  },
};
