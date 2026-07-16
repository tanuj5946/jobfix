import { prisma } from '../config/database';
import { aiServiceClient, type JobDescriptionAnalysis } from './aiServiceClient';

export interface JobPostingInput {
  title: string;
  description: string;
  location?: string | null;
  workMode?: 'remote' | 'hybrid' | 'onsite' | null;
  experienceLevel?: 'fresher' | '1_2_years' | '3_plus_years' | null;
  minVerifiedLevel?: 'beginner' | 'intermediate' | 'advanced' | null;
  requiredSkills?: Array<{ skillId: number; importance: 'high' | 'medium' | 'low' }>;
}

type JobUpdateInput = Partial<Omit<JobPostingInput, 'requiredSkills'>>;

const jobInclude = {
  requiredSkills: { include: { skill: true } },
  descriptionAnalysis: true,
} as const;

const getRecruiterProfile = (userId: number) =>
  prisma.recruiterProfile.findUnique({ where: { userId } });

export const jobService = {
  async create(userId: number, input: JobPostingInput) {
    const recruiter = await getRecruiterProfile(userId);
    if (!recruiter) return { error: 'recruiter_not_found' as const, job: null };
    if (!recruiter.companyName) return { error: 'company_required' as const, job: null };

    const job = await prisma.job.create({
      data: {
        recruiterId: recruiter.id,
        title: input.title,
        description: input.description,
        location: input.location ?? null,
        workMode: input.workMode ?? null,
        experienceLevel: input.experienceLevel ?? null,
        minVerifiedLevel: input.minVerifiedLevel ?? null,
        requiredSkills: input.requiredSkills?.length
          ? { create: input.requiredSkills.map((skill) => skill) }
          : undefined,
      },
      include: jobInclude,
    });

    try {
      const analysis = await aiServiceClient.analyzeJobDescription(
        job.title,
        job.description ?? '',
      );
      const analyzedJob = await this.storeDescriptionAnalysis(job.id, analysis);
      return { error: null, job: analyzedJob, analysisError: null };
    } catch (error) {
      await prisma.jobDescriptionAnalysis.upsert({
        where: { jobId: job.id },
        update: {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Job analysis failed',
        },
        create: {
          jobId: job.id,
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Job analysis failed',
        },
      });
      return { error: null, job, analysisError: 'Job stored, but AI analysis could not be completed.' };
    }
  },

  async storeDescriptionAnalysis(jobId: number, analysis: JobDescriptionAnalysis) {
    const requiredSkills = uniqueStrings(analysis.required_skills);
    const requiredSkillKeys = new Set(requiredSkills.map(normalizeSkillName));
    const preferredSkills = uniqueStrings(analysis.preferred_skills)
      .filter((skill) => !requiredSkillKeys.has(normalizeSkillName(skill)));

    await prisma.$transaction(async (tx) => {
      await tx.jobRequiredSkill.deleteMany({
        where: { jobId, source: 'ai_extracted' },
      });

      for (const [skillName, importance] of [
        ...requiredSkills.map((name) => [name, 'high'] as const),
        ...preferredSkills.map((name) => [name, 'low'] as const),
      ]) {
        const skill = await tx.skill.upsert({
          where: { name: skillName },
          update: {},
          create: { name: skillName },
        });
        await tx.jobRequiredSkill.upsert({
          where: { jobId_skillId: { jobId, skillId: skill.id } },
          update: { importance, source: 'ai_extracted' },
          create: { jobId, skillId: skill.id, importance, source: 'ai_extracted' },
        });
      }

      await tx.jobDescriptionAnalysis.upsert({
        where: { jobId },
        update: {
          requiredSkills,
          preferredSkills,
          education: analysis.education,
          responsibilities: analysis.responsibilities,
          experience: analysis.experience,
          status: 'completed',
          failureReason: null,
        },
        create: {
          jobId,
          requiredSkills,
          preferredSkills,
          education: analysis.education,
          responsibilities: analysis.responsibilities,
          experience: analysis.experience,
          status: 'completed',
        },
      });
    });

    return prisma.job.findUniqueOrThrow({ where: { id: jobId }, include: jobInclude });
  },

  async listMine(userId: number) {
    const recruiter = await getRecruiterProfile(userId);
    if (!recruiter) return null;

    return prisma.job.findMany({
      where: { recruiterId: recruiter.id },
      orderBy: { updatedAt: 'desc' },
      include: jobInclude,
    });
  },

  async findOwnedJob(userId: number, jobId: number) {
    const recruiter = await getRecruiterProfile(userId);
    if (!recruiter) return null;

    return prisma.job.findFirst({
      where: { id: jobId, recruiterId: recruiter.id },
      include: jobInclude,
    });
  },

  async update(userId: number, jobId: number, input: JobUpdateInput) {
    const ownedJob = await this.findOwnedJob(userId, jobId);
    if (!ownedJob) return null;

    return prisma.job.update({
      where: { id: ownedJob.id },
      data: input,
      include: jobInclude,
    });
  },

  async setStatus(userId: number, jobId: number, status: 'published' | 'closed') {
    const ownedJob = await this.findOwnedJob(userId, jobId);
    if (!ownedJob) return null;

    return prisma.job.update({ where: { id: ownedJob.id }, data: { status } });
  },

  async publish(userId: number, jobId: number) {
    const ownedJob = await this.findOwnedJob(userId, jobId);
    if (!ownedJob) return { error: 'job_not_found' as const, job: null };
    if (ownedJob.descriptionAnalysis?.status !== 'completed') {
      return { error: 'analysis_not_ready' as const, job: null };
    }
    if (!ownedJob.requiredSkills.length) {
      return { error: 'skills_not_extracted' as const, job: null };
    }
    return {
      error: null,
      job: await prisma.job.update({ where: { id: ownedJob.id }, data: { status: 'published' } }),
    };
  },

  async delete(userId: number, jobId: number) {
    const ownedJob = await this.findOwnedJob(userId, jobId);
    if (!ownedJob) return false;

    await prisma.job.delete({ where: { id: ownedJob.id } });
    return true;
  },
};

function normalizeSkillName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    const trimmed = value.trim();
    const normalized = normalizeSkillName(trimmed);
    if (trimmed && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(trimmed);
    }
    return result;
  }, []);
}
