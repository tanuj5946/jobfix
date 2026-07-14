import type { Request, Response } from 'express';
import { prisma }       from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

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
