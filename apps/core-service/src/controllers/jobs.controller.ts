import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { jobService } from '../services/job.service';

const requiredSkillSchema = z.object({
  skillId: z.number().int().positive(),
  importance: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const CreateJobSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(20_000),
  location: z.string().trim().min(2).max(150).nullable().optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).nullable().optional(),
  experienceLevel: z.enum(['fresher', '1_2_years', '3_plus_years']).nullable().optional(),
  minVerifiedLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  requiredSkills: z.array(requiredSkillSchema).max(30).optional(),
});

export const UpdateJobSchema = CreateJobSchema.omit({ requiredSkills: true }).partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'At least one job field is required' },
);

const parseJobId = (value: string) => Number.parseInt(value, 10);

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query as { search?: string };
  const page = Math.max(1, Number.parseInt((req.query.page as string) ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt((req.query.limit as string) ?? '20', 10) || 20));
  const skip = (page - 1) * limit;
  const where = {
    status: 'published',
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { requiredSkills: { include: { skill: true } } } }),
    prisma.job.count({ where }),
  ]);
  res.json({ success: true, data: jobs, total, page, limit });
});

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const job = await prisma.job.findFirst({
    where: { id: parseJobId(req.params.id), status: 'published' },
    include: { requiredSkills: { include: { skill: true } } },
  });
  if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  res.json({ success: true, data: job });
});

export const listMyJobs = asyncHandler(async (req: Request, res: Response) => {
  const jobs = await jobService.listMine(req.user!.userId);
  if (!jobs) { res.status(403).json({ success: false, message: 'Recruiter profile not found' }); return; }
  res.json({ success: true, data: jobs });
});

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await jobService.create(req.user!.userId, req.body as z.infer<typeof CreateJobSchema>);
  if (result.error === 'recruiter_not_found') {
    res.status(403).json({ success: false, message: 'Recruiter profile not found' });
    return;
  }
  if (result.error === 'company_required') {
    res.status(409).json({ success: false, message: 'Create a company before posting a job' });
    return;
  }
  res.status(201).json({ success: true, data: result.job });
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.update(req.user!.userId, parseJobId(req.params.id), req.body as z.infer<typeof UpdateJobSchema>);
  if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  res.json({ success: true, data: job });
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await jobService.delete(req.user!.userId, parseJobId(req.params.id));
  if (!deleted) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  res.status(204).send();
});

export const publishJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await jobService.publish(req.user!.userId, parseJobId(req.params.id));
  if (result.error === 'job_not_found') { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  if (result.error === 'analysis_not_ready') {
    res.status(409).json({ success: false, message: 'Job description analysis must complete before publishing' });
    return;
  }
  if (result.error === 'skills_not_extracted') {
    res.status(409).json({ success: false, message: 'A job needs at least one extracted skill before publishing' });
    return;
  }
  res.json({ success: true, data: result.job });
});

export const closeJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.setStatus(req.user!.userId, parseJobId(req.params.id), 'closed');
  if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
  res.json({ success: true, data: job });
});
