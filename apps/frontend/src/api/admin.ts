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
    companyName: string | null;
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

export interface AdminOverview {
  statistics: {
    candidates: { total: number; withResume: number; applications: number };
    recruiters: { total: number; withCompany: number; jobs: number };
    jobs: { total: number; byStatus: Record<string, number> };
    applications: { total: number; byStatus: Record<string, number>; averageResumeMatch: number | null; withAssessment: number };
    assessments: { total: number; byStatus: Record<string, number>; completed: number; averageScore: number | null };
    questionBank: { total: number; byType: Record<string, number>; byDifficulty: Record<string, number> };
  };
  companies: Array<{ id: number; name: string; website: string | null; industry: string | null; recruiterName: string; recruiterEmail: string; jobCount: number; createdAt: string }>;
  jobs: Array<{ id: number; title: string; status: string; createdAt: string; companyName: string | null; recruiterName: string; skillCount: number; applicationCount: number; analysisStatus: string }>;
  applications: Array<{ id: number; status: string; appliedAt: string; jobTitle: string; candidateName: string; candidateEmail: string; resumeMatchScore: number; assessmentStatus: string | null; assessmentScore: number | null }>;
  questionCoverage: Array<{ role: string; skill: string; questionCount: number }>;
}

export interface AnalyticsSummary {
  totalCandidates: number;
  totalRecruiters: number;
  jobsPosted: number;
  applications: number;
  assessments: number;
  questionRetrievalRate: number | null;
  questionGenerationRate: number | null;
  questionPipeline: { total: number; retrieved: number; generated: number };
  averageResumeMatch: number | null;
  averageAssessmentScore: number | null;
}

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  mostRequestedSkills: Array<{ id: number; name: string; category: string | null; requestedByJobs: number }>;
}

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => {
    const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users');
    return data.data;
  },
  getOverview: async (): Promise<AdminOverview> => {
    const { data } = await apiClient.get<ApiResponse<AdminOverview>>('/admin/overview');
    return data.data;
  },
  getAnalytics: async (): Promise<AnalyticsDashboard> => {
    const { data } = await apiClient.get<ApiResponse<AnalyticsDashboard>>('/admin/analytics');
    return data.data;
  },
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>('/admin/analytics/summary');
    return data.data;
  },
  getMostRequestedSkills: async (limit = 10): Promise<AnalyticsDashboard['mostRequestedSkills']> => {
    const { data } = await apiClient.get<ApiResponse<AnalyticsDashboard['mostRequestedSkills']>>('/admin/analytics/most-requested-skills', { params: { limit } });
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
