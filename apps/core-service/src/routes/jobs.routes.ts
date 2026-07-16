import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listJobs,
  getJobById,
  listMyJobs,
  createJob,
  updateJob,
  deleteJob,
  publishJob,
  closeJob,
  CreateJobSchema,
  UpdateJobSchema,
} from '../controllers/jobs.controller';

const router = Router();

// Candidate/public browsing remains limited to published jobs.
router.get('/', listJobs);
router.get('/mine', authMiddleware, requireRole('recruiter'), listMyJobs);
router.get('/:id', getJobById);

// The posting lifecycle is recruiter-only and uses the existing JWT middleware.
router.use(authMiddleware, requireRole('recruiter'));
router.post('/', validate(CreateJobSchema), createJob);
router.patch('/:id', validate(UpdateJobSchema), updateJob);
router.delete('/:id', deleteJob);
router.post('/:id/publish', publishJob);
router.post('/:id/close', closeJob);

export default router;
