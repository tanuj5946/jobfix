import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { applicationService } from '../services/application.service';

const parseJobId = (value: string) => Number.parseInt(value, 10);

export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await applicationService.apply(req.user!.userId, parseJobId(req.params.jobId));
  if (result.error === 'candidate_not_found') {
    res.status(403).json({ success: false, message: 'Candidate profile not found' });
    return;
  }
  if (result.error === 'resume_required') {
    res.status(400).json({ success: false, message: 'Upload and parse a resume before applying' });
    return;
  }
  if (result.error === 'job_not_found') {
    res.status(404).json({ success: false, message: 'Published job not found' });
    return;
  }
  if (result.error === 'already_applied') {
    res.status(409).json({ success: false, message: 'You have already applied to this job' });
    return;
  }
  res.status(201).json({
    success: true,
    data: result.application,
    ...(result.assessmentError && { message: `Application created. ${result.assessmentError}` }),
  });
});

export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await applicationService.listForCandidate(req.user!.userId);
  if (!applications) {
    res.status(403).json({ success: false, message: 'Candidate profile not found' });
    return;
  }
  res.json({ success: true, data: applications });
});
