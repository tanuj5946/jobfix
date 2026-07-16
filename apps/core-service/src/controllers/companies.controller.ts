import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { companyService } from '../services/company.service';

export const CreateCompanySchema = z.object({
  name: z.string().trim().min(2).max(200),
  website: z.string().url().nullable().optional(),
  industry: z.string().trim().min(2).max(100).nullable().optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'At least one company field is required' },
);

export const getMyCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await companyService.get(req.user!.userId);
  if (!company) {
    res.status(404).json({ success: false, message: 'Company not found' });
    return;
  }
  res.json({ success: true, data: company });
});

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const result = await companyService.create(req.user!.userId, req.body as z.infer<typeof CreateCompanySchema>);
  if (result.conflict) {
    res.status(409).json({ success: false, message: 'A company already exists for this recruiter' });
    return;
  }
  res.status(201).json({ success: true, data: result.company });
});

export const updateMyCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await companyService.update(req.user!.userId, req.body as z.infer<typeof UpdateCompanySchema>);
  if (!company) {
    res.status(404).json({ success: false, message: 'Company not found' });
    return;
  }
  res.json({ success: true, data: company });
});

export const deleteMyCompany = asyncHandler(async (req: Request, res: Response) => {
  const result = await companyService.deleteIfUnused(req.user!.userId);
  if (!result.deleted && result.reason === 'not_found') {
    res.status(404).json({ success: false, message: 'Company not found' });
    return;
  }
  if (!result.deleted) {
    res.status(409).json({ success: false, message: 'Company cannot be deleted while it has job postings' });
    return;
  }
  res.status(204).send();
});
