import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { aiServiceClient } from '../services/aiServiceClient';
import { adminOverviewService } from '../services/adminOverview.service';
import { analyticsService } from '../services/analytics.service';
import { questionBankService, type GeneratedQuestionForStorage } from '../services/questionBank.service';
import { asyncHandler } from '../utils/asyncHandler';

export const SeedQuestionBankSchema = z.object({
  role: z.string().trim().min(2).max(150).catch('Software Developer'),
  skillIds: z.array(z.coerce.number().int().positive()).min(1).max(20),
  countPerSkill: z.coerce.number().int().min(1).max(25).catch(10),
});

const userInclude = {
  candidateProfile: {
    include: {
      candidateSkills: { include: { skill: true } },
      assessments: { select: { id: true, status: true, createdAt: true } },
    },
  },
  recruiterProfile: {
    include: { jobs: { include: { requiredSkills: { include: { skill: true } } } } },
  },
} as const;

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ['candidate', 'recruiter'] } },
    include: userInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: users });
});

export const getUserDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: userInclude,
  });
  if (!user || user.role === 'admin') {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
});

export const seedQuestionBank = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as z.infer<typeof SeedQuestionBankSchema>;
  const skills = await prisma.skill.findMany({
    where: { id: { in: payload.skillIds } },
    select: { id: true, name: true },
  });
  if (skills.length !== new Set(payload.skillIds).size) {
    res.status(400).json({ success: false, message: 'One or more selected skills do not exist' });
    return;
  }

  const result = await aiServiceClient.seedQuestionBank(
    payload.role,
    skills.map(skill => skill.name),
    payload.countPerSkill,
  );
  const questions = result.results.flatMap(item => item.questions ?? []);
  const stored = await questionBankService.storeGenerated(questions as unknown as GeneratedQuestionForStorage[]);
  res.json({ success: true, data: { ...result, stored: stored.length } });
});

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await adminOverviewService.getOverview() });
});

export const getAnalyticsDashboard = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await analyticsService.getDashboard() });
});

export const getAnalyticsSummary = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await analyticsService.getSummary() });
});

export const getMostRequestedSkills = asyncHandler(async (req: Request, res: Response) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 10;
  res.json({ success: true, data: await analyticsService.getMostRequestedSkills(limit) });
});
