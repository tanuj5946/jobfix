import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { aiServiceClient } from '../services/aiServiceClient';
import { resumeService } from '../services/resume.service';
import { candidateService } from '../services/candidate.service';
import { assessmentService } from '../services/assessment.service';

const COMMON_ROLE_WORDS = new Set([
  'and',
  'developer',
  'engineer',
  'intern',
  'junior',
  'senior',
  'software',
  'trainee',
]);

function buildRoleSearchTerms(targetRole: string | null | undefined): string[] {
  if (!targetRole) return [];

  const terms = targetRole
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2 && !COMMON_ROLE_WORDS.has(term));

  return Array.from(new Set([targetRole, ...terms]));
}

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!profile) {
    res.status(404).json({ success: false, message: 'Candidate profile not found' });
    return;
  }
  res.json({ success: true, data: profile });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const { targetRole } = req.body as { targetRole?: string };

  const profile = await prisma.candidateProfile.update({
    where: { userId: req.user!.userId },
    data: { targetRole },
  });
  res.json({ success: true, data: profile });
});

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  const parsed = await aiServiceClient.parseResume(
    file.buffer,
    file.mimetype,
    file.originalname,
  );

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: req.user!.userId },
    update: {
      parsedResumeJson: parsed as unknown as Prisma.InputJsonValue,
      targetRole: parsed.target_role_guess ?? undefined,
    },
    create: {
      userId: req.user!.userId,
      parsedResumeJson: parsed as unknown as Prisma.InputJsonValue,
      targetRole: parsed.target_role_guess ?? undefined,
    },
  });

  for (const parsedSkill of parsed.skills) {
    const skill = await prisma.skill.upsert({
      where: { name: parsedSkill.name },
      update: {},
      create: { name: parsedSkill.name },
    });

    await prisma.candidateSkill.upsert({
      where: {
        candidateId_skillId: { candidateId: profile.id, skillId: skill.id },
      },
      update: { parseConfidence: parsedSkill.confidence, source: 'auto_detected' },
      create: {
        candidateId: profile.id,
        skillId: skill.id,
        source: 'auto_detected',
        parseConfidence: parsedSkill.confidence,
      },
    });
  }

  const detectedSkills = await prisma.candidateSkill.findMany({
    where: { candidateId: profile.id },
    include: { skill: true },
    orderBy: { skill: { name: 'asc' } },
  });

  res.json({
    success: true,
    data: {
      parsed,
      profile,
      skills: detectedSkills,
    },
  });
});

export const getMyCandidateSkills = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }

  const skills = await prisma.candidateSkill.findMany({
    where: { candidateId: profile.id },
    include: { skill: true },
    orderBy: { skill: { name: 'asc' } },
  });
  res.json({ success: true, data: skills });
});

export const confirmSkills = asyncHandler(async (req: Request, res: Response) => {
  const { skillIds } = req.body as { skillIds: number[] };

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }

  const uniqueSkillIds = Array.from(
    new Set((Array.isArray(skillIds) ? skillIds : []).filter(Number.isInteger)),
  );

  await prisma.candidateSkill.deleteMany({
    where: {
      candidateId: profile.id,
      ...(uniqueSkillIds.length ? { skillId: { notIn: uniqueSkillIds } } : {}),
    },
  });

  if (uniqueSkillIds.length) {
    await prisma.candidateSkill.createMany({
      data: uniqueSkillIds.map(skillId => ({
        candidateId: profile.id,
        skillId,
        source: 'manually_added',
      })),
      skipDuplicates: true,
    });

    await prisma.candidateSkill.updateMany({
      where: {
        candidateId: profile.id,
        skillId: { in: uniqueSkillIds },
      },
      data: { source: 'manually_added' },
    });
  }

  const updatedSkills = await prisma.candidateSkill.findMany({
    where: { candidateId: profile.id },
    include: { skill: true },
    orderBy: { skill: { name: 'asc' } },
  });

  res.json({ success: true, data: updatedSkills });
});

export const getMyJobRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { candidateSkills: { include: { skill: true } } },
  });

  if (!profile) {
    res.status(404).json({ success: false, message: 'Profile not found' });
    return;
  }

  const skillIds = profile.candidateSkills.map(item => item.skillId);
  const roleTerms = buildRoleSearchTerms(profile.targetRole);
  const orFilters: Prisma.JobWhereInput[] = [];

  if (skillIds.length) {
    orFilters.push({ requiredSkills: { some: { skillId: { in: skillIds } } } });
  }

  for (const term of roleTerms) {
    orFilters.push({ title: { contains: term, mode: 'insensitive' } });
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: 'published',
      ...(orFilters.length ? { OR: orFilters } : {}),
    },
    include: { requiredSkills: { include: { skill: true } } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  const candidateSkillSet = new Set(skillIds);
  const targetRole = profile.targetRole?.toLowerCase() ?? '';
  const lowerRoleTerms = roleTerms.map(term => term.toLowerCase());

  const recommendations = jobs
    .map(job => {
      const matchedSkills = job.requiredSkills.filter(item => candidateSkillSet.has(item.skillId));
      const requiredCount = job.requiredSkills.length;
      const skillScore = requiredCount ? (matchedSkills.length / requiredCount) * 70 : 0;
      const lowerTitle = job.title.toLowerCase();
      const titleScore =
        targetRole && lowerTitle.includes(targetRole)
          ? 30
          : lowerRoleTerms.some(term => lowerTitle.includes(term))
            ? 18
            : 0;
      const matchScore = Math.min(100, Math.round(skillScore + titleScore));

      return {
        job,
        matchScore,
        matchedSkills: matchedSkills.map(item => item.skill.name),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || b.job.createdAt.getTime() - a.job.createdAt.getTime());

  res.json({
    success: true,
    data: {
      targetRole: profile.targetRole,
      skills: profile.candidateSkills.map(item => item.skill.name),
      jobTitles: Array.from(new Set(recommendations.map(item => item.job.title))),
      recommendations,
    },
  });
});

export const uploadCandidateResume = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = await resumeService.uploadAndParseResume(req.user!.userId, req.file!);
    res.status(201).json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Resume upload failed',
    });
  }
});

export const getCandidateResume = asyncHandler(async (req: Request, res: Response) => {
  const data = await candidateService.getResume(req.user!.userId);
  res.json({ success: true, message: 'Resume loaded', data });
});

export const getSuggestedRoles = asyncHandler(async (req: Request, res: Response) => {
  const data = await candidateService.getSuggestedRoles(req.user!.userId);
  res.json({ success: true, message: 'Suggested roles loaded', data });
});

export const selectRole = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { role } = req.body as { role?: string };
    const data = await candidateService.selectRole(req.user!.userId, role ?? '');
    res.json({ success: true, message: 'Role selected', data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Role selection failed',
    });
  }
});

export const selectSkills = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { skills } = req.body as { skills?: string[] };
    const data = await candidateService.selectSkills(req.user!.userId, skills ?? []);
    res.json({ success: true, message: 'Skills selected', data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Skill selection failed',
    });
  }
});

export const createCandidateAssessment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = await assessmentService.createForCandidate(req.user!.userId);
    res.status(201).json({ success: true, message: 'Assessment created', data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Assessment creation failed',
    });
  }
});

export const getCandidateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const assessmentId = Number(req.params.id);
  if (!Number.isInteger(assessmentId)) {
    res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    return;
  }

  try {
    const data = await assessmentService.getCandidateAssessment(req.user!.userId, assessmentId);
    res.json({ success: true, message: 'Assessment loaded', data });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : 'Assessment not found',
    });
  }
});

export const submitCandidateAssessment = asyncHandler(async (req: Request, res: Response) => {
  const assessmentId = Number(req.params.id ?? req.body.assessmentId ?? req.body.assessment_id);
  if (!Number.isInteger(assessmentId)) {
    res.status(400).json({ success: false, message: 'Invalid assessment ID' });
    return;
  }

  try {
    const { answers } = req.body as {
      answers?: Array<{ question_id: number; candidate_answer: string }>;
    };
    const data = await assessmentService.submitCandidateAssessment(
      req.user!.userId,
      assessmentId,
      answers ?? [],
    );
    res.json({ success: true, message: 'Assessment submitted', data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Assessment submission failed',
    });
  }
});

export const getCandidateResults = asyncHandler(async (req: Request, res: Response) => {
  const data = await assessmentService.listResults(req.user!.userId);
  res.json({ success: true, message: 'Candidate results loaded', data });
});

export const getCandidateDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await candidateService.getDashboard(req.user!.userId);
  res.json({ success: true, message: 'Candidate dashboard loaded', data });
});
