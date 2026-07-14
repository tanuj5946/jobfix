import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listJobs, getJobById, createJob, updateJob, deleteJob, publishJob, closeJob,
} from '../controllers/jobs.controller';

const router = Router();

// Public — anyone can browse published jobs
router.get('/',    listJobs);
router.get('/:id', getJobById);

// Recruiter-only mutations
router.post(  '/',                authMiddleware, createJob);
router.patch( '/:id',            authMiddleware, updateJob);
router.delete('/:id',            authMiddleware, deleteJob);
router.post(  '/:id/publish',    authMiddleware, publishJob);
router.post(  '/:id/close',      authMiddleware, closeJob);

export default router;
