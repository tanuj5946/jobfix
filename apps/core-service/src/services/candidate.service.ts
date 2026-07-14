import { candidateRepository } from '../repositories/candidate.repository';

export class CandidateService {
  async getProfile(userId: number) {
    const profile = await candidateRepository.findProfileByUserId(userId);
    if (!profile) throw new Error('Candidate profile not found');
    return profile;
  }

  async getResume(userId: number) {
    const profile = await this.getProfile(userId);
    return {
      resume_url: profile.resumeUrl,
      parsed_resume_json: profile.parsedResumeJson,
      resume_status: profile.parsedResumeJson ? 'parsed' : 'not_uploaded',
    };
  }

  async getSuggestedRoles(userId: number) {
    const profile = await this.getProfile(userId);
    const parsed = profile.parsedResumeJson as { target_role_guess?: string | null } | null;
    return {
      suggested_roles: parsed?.target_role_guess ? [parsed.target_role_guess] : [],
      selected_role: profile.targetRole,
    };
  }

  async selectRole(userId: number, role: string) {
    if (!role?.trim()) throw new Error('Role is required');
    const profile = await this.getProfile(userId);
    return candidateRepository.updateSelectedRole(profile.id, role.trim());
  }

  async selectSkills(userId: number, skills: string[]) {
    if (!Array.isArray(skills) || skills.length === 0) {
      throw new Error('At least one skill is required');
    }

    const uniqueSkills = Array.from(new Set(skills.map(skill => skill.trim()).filter(Boolean)));
    if (uniqueSkills.length === 0 || uniqueSkills.length > 30) {
      throw new Error('Select between 1 and 30 skills');
    }

    const profile = await this.getProfile(userId);
    return candidateRepository.replaceSelectedSkills(profile.id, uniqueSkills);
  }

  async getDashboard(userId: number) {
    const profile = await this.getProfile(userId);
    const latestAssessment = profile.assessments[0] ?? null;
    const latestResult = latestAssessment?.result ?? null;
    const skillBreakdown = (latestResult?.skillBreakdownJson ?? {}) as Record<string, number>;

    return {
      profile,
      resume_status: profile.parsedResumeJson ? 'parsed' : 'not_uploaded',
      suggested_roles: await this.getSuggestedRoles(userId),
      selected_role: profile.targetRole,
      selected_skills: profile.candidateSkills.map(item => item.skill.name),
      assessment_status: latestAssessment?.status ?? 'not_started',
      latest_score: latestResult?.overallScore ?? null,
      assessment_history: profile.assessments,
      weak_skills: Object.entries(skillBreakdown)
        .filter(([, score]) => Number(score) < 70)
        .map(([skill, score]) => ({ skill, score })),
      strong_skills: Object.entries(skillBreakdown)
        .filter(([, score]) => Number(score) >= 80)
        .map(([skill, score]) => ({ skill, score })),
      learning_recommendations: profile.learningRecommendations,
    };
  }
}

export const candidateService = new CandidateService();
