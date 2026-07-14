import type { Request, Response } from 'express';
import { prisma }       from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

export const listSkills = asyncHandler(async (req: Request, res: Response) => {
  const { search, category } = req.query as { search?: string; category?: string };
  const page  = parseInt((req.query.page as string) ?? '1', 10);
  const limit = parseInt((req.query.limit as string) ?? '50', 10);
  const skip  = (page - 1) * limit;

  const where = {
    ...(search   ? { name:     { contains: search,   mode: 'insensitive' as const } } : {}),
    ...(category ? { category: { equals:   category, mode: 'insensitive' as const } } : {}),
  };

  const [skills, total] = await Promise.all([
    prisma.skill.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.skill.count({ where }),
  ]);

  res.json({ success: true, data: skills, total, page, limit });
});

export const getSkillById = asyncHandler(async (req: Request, res: Response) => {
  const skill = await prisma.skill.findUnique({ where: { id: parseInt(req.params.id, 10) } });
  if (!skill) { res.status(404).json({ success: false, message: 'Skill not found' }); return; }
  res.json({ success: true, data: skill });
});
