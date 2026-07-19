import axios, { AxiosError, AxiosInstance } from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';

export interface ParsedSkill {
  name: string;
  confidence: number;
}

export interface ParsedResumeResult {
  personal_info: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    github: string | null;
    linkedin: string | null;
  };
  skills: ParsedSkill[];
  target_role_guess: string | null;
  experience: unknown[];
  education: unknown[];
  summary: string | null;
}

export interface AiAssessmentQuestion {
  question_id?: number | string | null;
  question_type: 'mcq' | 'conceptual';
  skill: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question?: string;
  question_text?: string;
  options?: unknown;
  correct_answer?: string | null;
  rubric?: unknown;
  marks?: number;
  embedding?: number[];
}

export interface AiGeneratedAssessment {
  final_assessment?: {
    assessment_id: string;
    role: string;
    title: string;
    duration: number;
    total_questions: number;
    created_at: string;
    questions: AiAssessmentQuestion[];
  };
  skill_weights?: Record<string, number>;
  missing_core_skills?: string[];
  blueprint?: unknown[];
}

export interface AiEvaluationResult {
  submission_id?: number;
  assessment_id?: number;
  result: unknown;
}

export interface MatchResult {
  match_score: number;
  explanation: string;
}

export interface SkillGap {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  resources: Array<{
    title: string;
    url: string;
    type: 'course' | 'article' | 'practice_problems' | 'video';
  }>;
}

export interface ImprovementPlan {
  skill_gaps: SkillGap[];
}

export interface QuestionBankSeedResult {
  role: string;
  results: Array<{ skill: string; generated: number; prepared: number; failed: number; questions?: Array<Record<string, unknown>> }>;
  generated: number;
  prepared: number;
  failed: number;
}

export interface JobDescriptionAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  education: string | null;
  responsibilities: string[];
  experience: string | null;
}

class AiServiceClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: env.AI_SERVICE_URL,
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  async parseResume(
    fileBuffer: Buffer,
    mimeType: string,
    originalName = 'resume.pdf',
  ): Promise<ParsedResumeResult> {
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });

    return this.requestWithRetry<ParsedResumeResult>(() =>
      this.http.post('/resume/parse', form, { headers: form.getHeaders() }),
    );
  }

  async createAssessment(
    selectedSkills: string[],
    targetRole: string,
  ): Promise<AiGeneratedAssessment> {
    return this.requestWithRetry<AiGeneratedAssessment>(() =>
      this.http.post('/assessment/generate', {
        target_role: targetRole,
        selected_skills: selectedSkills,
      }),
    );
  }

  async analyzeJobDescription(
    title: string,
    description: string,
  ): Promise<JobDescriptionAnalysis> {
    return this.requestWithRetry<JobDescriptionAnalysis>(() =>
      this.http.post('/jobs/analyze-description', { title, description }),
    );
  }

  async evaluateAssessment(payload: {
    assessment_id: number;
    candidate_id: number;
    attempt_id: number;
  }): Promise<AiEvaluationResult> {
    return this.requestWithRetry<AiEvaluationResult>(() =>
      this.http.post('/assessment/evaluate', payload),
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.requestWithRetry(() => this.http.get('/health'));
      return true;
    } catch {
      return false;
    }
  }

  async getMatchExplanation(
    candidateVerifiedSkills: string[],
    jobRequiredSkills: string[],
  ): Promise<MatchResult> {
    try {
      return await this.requestWithRetry<MatchResult>(() =>
        this.http.post('/match-explanation', {
          candidate_verified_skills: candidateVerifiedSkills,
          job_required_skills: jobRequiredSkills,
        }),
      );
    } catch {
      const candidateSet = new Set(candidateVerifiedSkills.map(skill => skill.toLowerCase()));
      const matched = jobRequiredSkills.filter(skill => candidateSet.has(skill.toLowerCase()));
      const matchScore = jobRequiredSkills.length
        ? Math.round((matched.length / jobRequiredSkills.length) * 100)
        : 0;

      return {
        match_score: matchScore,
        explanation: matched.length
          ? `Matched skills: ${matched.join(', ')}.`
          : 'No direct required skill matches were found.',
      };
    }
  }

  async getImprovementPlan(
    targetRole: string,
    assessmentSummary: unknown,
  ): Promise<ImprovementPlan> {
    try {
      return await this.requestWithRetry<ImprovementPlan>(() =>
        this.http.post('/improvement-plan', {
          target_role: targetRole,
          assessment_summary: assessmentSummary,
        }),
      );
    } catch {
      return {
        skill_gaps: [
          {
            skill: targetRole,
            priority: 'medium',
            resources: [
              {
                title: `Practice fundamentals for ${targetRole}`,
                url: 'https://roadmap.sh/',
                type: 'article',
              },
            ],
          },
        ],
      };
    }
  }

  async generateAssessment(
    skillList: string[],
    targetRole: string,
  ): Promise<AiAssessmentQuestion[]> {
    const generated = await this.createAssessment(skillList, targetRole);
    return generated.final_assessment?.questions ?? [];
  }

  async seedQuestionBank(
    role: string,
    skills: string[],
    countPerSkill: number,
  ): Promise<QuestionBankSeedResult> {
    return this.requestWithRetry<QuestionBankSeedResult>(() =>
      this.http.post('/questions/seed', {
        role,
        skills,
        count_per_skill: countPerSkill,
      }, { timeout: 600_000 }),
    );
  }

  private async requestWithRetry<T>(
    request: () => Promise<{ data: T }>,
  ): Promise<T> {
    try {
      const response = await request();

console.log("\n================ AI RESPONSE ================");
console.dir(response.data, { depth: null });
console.log("=============================================\n");

return response.data;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        const response = await request();
        return response.data;
      } catch (retryError) {
        throw this.normalizeError(retryError);
      }
    }
  }

  private normalizeError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string; message?: string }>;

      if (axiosError.code === 'ECONNABORTED') {
        return new Error('AI service request timed out');
      }

      if (axiosError.response) {
        const detail =
          axiosError.response.data?.detail ??
          axiosError.response.data?.message ??
          axiosError.message;
        return new Error(`AI service failed (${axiosError.response.status}): ${detail}`);
      }

      return new Error(`AI service is unavailable: ${axiosError.message}`);
    }

    return error instanceof Error ? error : new Error('AI service request failed');
  }
}

export const aiServiceClient = new AiServiceClient();
