import type { Request, Response } from 'express';
import { prisma }       from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { applicationService, type CandidateRankingSort } from '../services/application.service';

export const getMyRecruiterProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!profile) { res.status(404).json({ success: false, message: 'Recruiter profile not found' }); return; }
  res.json({ success: true, data: profile });
});

export const updateMyRecruiterProfile = asyncHandler(async (req: Request, res: Response) => {
  const { companyName, companyWebsite, industry } =
    req.body as { companyName?: string; companyWebsite?: string; industry?: string };

  const profile = await prisma.recruiterProfile.update({
    where: { userId: req.user!.userId },
    data: { companyName, companyWebsite, industry },
  });
  res.json({ success: true, data: profile });
});

/** Recruiter-only data for the JobFix recruiter dashboard. */
export const getRecruiterDashboard = asyncHandler(async (req: Request, res: Response) => {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId: req.user!.userId },
    include: {
      jobs: {
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { _count: { select: { matches: true } } },
      },
    },
  });

  if (!profile) {
    res.status(404).json({ success: false, message: 'Recruiter profile not found' });
    return;
  }

  const [verifiedCandidates, matchesGenerated, totalJobs, activeJobs] = await Promise.all([
    prisma.candidateProfile.count({
      where: { candidateSkills: { some: { verifiedScore: { not: null } } } },
    }),
    prisma.jobMatch.count({ where: { job: { recruiterId: profile.id } } }),
    prisma.job.count({ where: { recruiterId: profile.id } }),
    prisma.job.count({ where: { recruiterId: profile.id, status: 'published' } }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        activeJobs,
        totalJobs,
        matchesGenerated,
        verifiedCandidates,
      },
      recentJobs: profile.jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        updatedAt: job.updatedAt,
        matchCount: job._count.matches,
      })),
    },
  });
});

export const getRankedCandidatesForJob = asyncHandler(async (req: Request, res: Response) => {
  const jobId = Number.parseInt(req.params.jobId, 10);
  const requestedSort = req.query.sort;
  const sort: CandidateRankingSort = (
    requestedSort === 'latest'
    || requestedSort === 'resume_match'
    || requestedSort === 'assessment_score'
  ) ? requestedSort : 'overall';

  const result = await applicationService.listRankedForRecruiter(
    req.user!.userId,
    jobId,
    sort,
  );
  if (result.error === 'recruiter_not_found') {
    res.status(403).json({ success: false, message: 'Recruiter profile not found' });
    return;
  }
  if (result.error === 'job_not_found') {
    res.status(404).json({ success: false, message: 'Job not found' });
    return;
  }
  res.json({ success: true, data: result.candidates, sort });
});
