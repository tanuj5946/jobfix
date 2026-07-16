import { prisma } from '../config/database';
import { assessmentService } from './assessment.service';

const applicationInclude = {
  job: {
    include: {
      requiredSkills: { include: { skill: true } },
      recruiter: { include: { user: { select: { name: true } } } },
    },
  },
  assessment: true,
} as const;

const recruiterApplicationInclude = {
  candidate: {
    include: {
      user: { select: { name: true, email: true } },
      candidateSkills: { include: { skill: true } },
    },
  },
  assessment: { include: { result: true } },
} as const;

export type CandidateRankingSort = 'overall' | 'latest' | 'resume_match' | 'assessment_score';

const normalize = (value: string) => value.trim().toLocaleLowerCase();

type ParsedResumeSkill = string | { name?: unknown };

function extractResumeSkills(parsedResumeJson: unknown): string[] {
  if (!parsedResumeJson || typeof parsedResumeJson !== 'object') return [];

  const skills = (parsedResumeJson as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) return [];

  const seen = new Set<string>();
  return skills.reduce<string[]>((result, skill: ParsedResumeSkill) => {
    const name = typeof skill === 'string'
      ? skill
      : typeof skill?.name === 'string'
        ? skill.name
        : '';
    const normalized = normalize(name);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(name.trim());
    }
    return result;
  }, []);
}

function skillWeight(importance: string): number {
  if (importance === 'high') return 3;
  if (importance === 'medium') return 2;
  return 1;
}

export const applicationService = {
  async apply(candidateUserId: number, jobId: number) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
      include: { candidateSkills: { include: { skill: true } } },
    });
    if (!candidate) return { error: 'candidate_not_found' as const, application: null };
    if (!candidate.parsedResumeJson) return { error: 'resume_required' as const, application: null };

    const job = await prisma.job.findFirst({
      where: { id: jobId, status: 'published' },
      include: { requiredSkills: { include: { skill: true } } },
    });
    if (!job) return { error: 'job_not_found' as const, application: null };

    const existing = await prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
    });
    if (existing) return { error: 'already_applied' as const, application: null };

    const parsedResumeSkills = extractResumeSkills(candidate.parsedResumeJson);
    const resumeSkills = parsedResumeSkills.length
      ? parsedResumeSkills
      : candidate.candidateSkills.map((item) => item.skill.name);
    const resumeSkillSet = new Set(resumeSkills.map(normalize));
    const jobSkills = job.requiredSkills.map((item) => ({
      name: item.skill.name,
      importance: item.importance,
    }));
    const matchedSkills = jobSkills
      .filter((skill) => resumeSkillSet.has(normalize(skill.name)))
      .map((skill) => skill.name);
    const missingSkillEntries = jobSkills
      .filter((skill) => !resumeSkillSet.has(normalize(skill.name)));
    const missingSkills = missingSkillEntries.map((skill) => skill.name);
    const totalWeight = jobSkills.reduce((sum, skill) => sum + skillWeight(skill.importance), 0);
    const matchedWeight = jobSkills
      .filter((skill) => resumeSkillSet.has(normalize(skill.name)))
      .reduce((sum, skill) => sum + skillWeight(skill.importance), 0);
    const score = totalWeight
      ? Number(((matchedWeight / totalWeight) * 100).toFixed(2))
      : 0;

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: candidate.id,
        resumeMatchScore: score,
        matchDetailsJson: {
          matchedSkills,
          missingSkills,
          skillGap: missingSkillEntries.map((skill) => ({
            skill: skill.name,
            priority: skill.importance === 'high' ? 'high' : skill.importance === 'medium' ? 'medium' : 'low',
          })),
          resumeSkills,
          jobSkills,
          evaluatedSkillCount: jobSkills.length,
          calculation: 'parsed_resume_weighted_skill_overlap',
        },
      },
      include: applicationInclude,
    });

    try {
      const assessment = await assessmentService.createForApplication(application.id);
      return { error: null, application: { ...application, assessment }, assessmentError: null };
    } catch (error) {
      return {
        error: null,
        application,
        assessmentError: error instanceof Error ? error.message : 'Assessment generation could not be started',
      };
    }
  },

  async listForCandidate(candidateUserId: number) {
    const candidate = await prisma.candidateProfile.findUnique({ where: { userId: candidateUserId } });
    if (!candidate) return null;

    return prisma.application.findMany({
      where: { candidateId: candidate.id },
      include: applicationInclude,
      orderBy: { appliedAt: 'desc' },
    });
  },

  async listRankedForRecruiter(recruiterUserId: number, jobId: number, sort: CandidateRankingSort) {
    const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId: recruiterUserId } });
    if (!recruiter) return { error: 'recruiter_not_found' as const, candidates: null };

    const job = await prisma.job.findFirst({
      where: { id: jobId, recruiterId: recruiter.id },
      include: { requiredSkills: { include: { skill: true } } },
    });
    if (!job) return { error: 'job_not_found' as const, candidates: null };

    const applications = await prisma.application.findMany({
      where: { jobId },
      include: recruiterApplicationInclude,
    });
    const jobSkillIds = new Set(job.requiredSkills.map((item) => item.skillId));

    const candidates = applications.map((application) => {
      const candidateSkillIds = new Set(application.candidate.candidateSkills.map((item) => item.skillId));
      const matchedSkillCount = job.requiredSkills.filter((item) => candidateSkillIds.has(item.skillId)).length;
      const skillCoverage = jobSkillIds.size
        ? Number(((matchedSkillCount / jobSkillIds.size) * 100).toFixed(2))
        : 0;
      const assessmentScore = application.assessment?.result
        ? Number(application.assessment.result.overallScore)
        : null;
      const overallAiScore = Number((
        (Number(application.resumeMatchScore) * 0.35)
        + ((assessmentScore ?? 0) * 0.45)
        + (skillCoverage * 0.20)
      ).toFixed(2));

      return {
        applicationId: application.id,
        candidateId: application.candidateId,
        candidateName: application.candidate.user.name,
        candidateEmail: application.candidate.user.email,
        status: application.status,
        appliedAt: application.appliedAt,
        resumeMatch: Number(application.resumeMatchScore),
        assessmentScore,
        skillCoverage,
        overallAiScore,
        assessmentStatus: application.assessment?.status ?? 'not_started',
      };
    });

    candidates.sort((left, right) => {
      if (sort === 'latest') return right.appliedAt.getTime() - left.appliedAt.getTime();
      if (sort === 'resume_match') return right.resumeMatch - left.resumeMatch || right.appliedAt.getTime() - left.appliedAt.getTime();
      if (sort === 'assessment_score') return (right.assessmentScore ?? -1) - (left.assessmentScore ?? -1) || right.appliedAt.getTime() - left.appliedAt.getTime();
      return right.overallAiScore - left.overallAiScore || right.appliedAt.getTime() - left.appliedAt.getTime();
    });

    return { error: null, candidates };
  },
};
