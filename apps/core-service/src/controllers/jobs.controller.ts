import type { Request, Response } from 'express';
import { prisma }       from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const { status, search } = req.query as { status?: string; search?: string };
  const page  = parseInt((req.query.page as string) ?? '1', 10);
  const limit = parseInt((req.query.limit as string) ?? '20', 10);
  const skip  = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { requiredSkills: { include: { skill: true } } } }),
    prisma.job.count({ where }),
  ]);
  res.json({ success: true, data: jobs, total, page, limit });
});

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const job = await prisma.job.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { requiredSkills: { include: { skill: true } } },
  });
  if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  res.json({ success: true, data: job });
});

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, location, workMode, experienceLevel, minVerifiedLevel, requiredSkills } =
    req.body as {
      title: string; description?: string; location?: string;
      workMode?: string; experienceLevel?: string; minVerifiedLevel?: string;
      requiredSkills?: Array<{ skillId: number; importance: string }>;
    };

  const recruiterProfile = await prisma.recruiterProfile.findUnique({ where: { userId: req.user!.userId } });
  if (!recruiterProfile) { res.status(403).json({ success: false, message: 'Recruiter profile not found' }); return; }

  const job = await prisma.job.create({
    data: {
      recruiterId: recruiterProfile.id,
      title, description, location,
      workMode: workMode as string | undefined,
      experienceLevel: experienceLevel as string | undefined,
      minVerifiedLevel: minVerifiedLevel as string | undefined,
      requiredSkills: requiredSkills?.length
        ? { create: requiredSkills.map(s => ({ skillId: s.skillId, importance: s.importance })) }
        : undefined,
    },
    include: { requiredSkills: { include: { skill: true } } },
  });
  res.status(201).json({ success: true, data: job });
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const id   = parseInt(req.params.id, 10);
  const body = req.body as Partial<{ title: string; description: string; status: string; location: string }>;
  const job  = await prisma.job.update({ where: { id }, data: body, include: { requiredSkills: { include: { skill: true } } } });
  res.json({ success: true, data: job });
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  await prisma.job.delete({ where: { id: parseInt(req.params.id, 10) } });
  res.status(204).send();
});

export const publishJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await prisma.job.update({ where: { id: parseInt(req.params.id, 10) }, data: { status: 'published' } });
  res.json({ success: true, data: job });
});

export const closeJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await prisma.job.update({ where: { id: parseInt(req.params.id, 10) }, data: { status: 'closed' } });
  res.json({ success: true, data: job });
});
