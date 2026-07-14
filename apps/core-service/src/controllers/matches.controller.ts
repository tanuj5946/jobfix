import type { Request, Response } from 'express';
import { prisma }          from '../config/database';
import { asyncHandler }    from '../utils/asyncHandler';
import { aiServiceClient } from '../services/aiServiceClient';

export const getMatchesForJob = asyncHandler(async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.jobId, 10);

  const matches = await prisma.jobMatch.findMany({
    where:   { jobId },
    orderBy: { matchScore: 'desc' },
    include: { candidate: { include: { user: { select: { name: true, email: true } } } } },
  });
  res.json({ success: true, data: matches });
});

export const runMatch = asyncHandler(async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.jobId, 10);

  // Fetch job required skills
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { requiredSkills: { include: { skill: true } } },
  });
  if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }

  const requiredSkillNames = job.requiredSkills.map(rs => rs.skill.name);

  // Fetch all candidates with verified skills
  const candidates = await prisma.candidateProfile.findMany({
    include: { candidateSkills: { include: { skill: true } } },
  });

  // Run match for each candidate through ai-service
  const upserts = await Promise.all(
    candidates.map(async (candidate) => {
      const candidateSkillNames = candidate.candidateSkills.map(cs => cs.skill.name);
      const match = await aiServiceClient.getMatchExplanation(candidateSkillNames, requiredSkillNames);

      return prisma.jobMatch.upsert({
        where:  { jobId_candidateId: { jobId, candidateId: candidate.id } },
        update: { matchScore: match.match_score, aiExplanation: match.explanation, matchedAt: new Date() },
        create: { jobId, candidateId: candidate.id, matchScore: match.match_score, aiExplanation: match.explanation },
      });
    }),
  );

  res.json({ success: true, data: { matched: upserts.length } });
});
