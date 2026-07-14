import type { Request, Response } from 'express';
import { prisma }          from '../config/database';
import { asyncHandler }    from '../utils/asyncHandler';
import { aiServiceClient } from '../services/aiServiceClient';

export const getImprovementPlan = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.candidateProfile.findUnique({
    where:   { userId: req.user!.userId },
    include: { assessments: { where: { status: 'completed' }, orderBy: { completedAt: 'desc' }, take: 5 } },
  });
  if (!profile) { res.status(404).json({ success: false, message: 'Candidate profile not found' }); return; }

  // Call ai-service for improvement plan
  const plan = await aiServiceClient.getImprovementPlan(
    profile.targetRole ?? 'General Software Developer',
    profile.assessments,
  );

  // Persist recommendations to learning_recommendations
  // For each gap, find/create the skill and upsert resources
  const created = await Promise.all(
    plan.skill_gaps.map(async (gap) => {
      const skill = await prisma.skill.upsert({
        where:  { name: gap.skill },
        update: {},
        create: { name: gap.skill },
      });

      return Promise.all(
        gap.resources.map(resource =>
          prisma.learningRecommendation.create({
            data: {
              candidateId:   profile.id,
              skillId:       skill.id,
              resourceTitle: resource.title,
              resourceUrl:   resource.url,
              resourceType:  resource.type,
              priority:      gap.priority,
            },
            include: { skill: true },
          }),
        ),
      );
    }),
  );

  res.json({ success: true, data: created.flat() });
});

export const getPlanHistory = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

  const recs = await prisma.learningRecommendation.findMany({
    where:   { candidateId: profile.id },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { skill: true },
  });
  res.json({ success: true, data: recs });
});

export const markRecommendationComplete = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const rec = await prisma.learningRecommendation.update({
    where:   { id },
    data:    { status: 'completed' },
    include: { skill: true },
  });
  res.json({ success: true, data: rec });
});
