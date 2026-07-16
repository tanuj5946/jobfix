import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole }    from '../middleware/role.middleware';
import {
  getMyRecruiterProfile,
  updateMyRecruiterProfile,
  getRecruiterDashboard,
  getRankedCandidatesForJob,
} from '../controllers/recruiters.controller';

const router = Router();

router.use(authMiddleware, requireRole('recruiter'));

router.get(  '/dashboard', getRecruiterDashboard);
router.get(  '/jobs/:jobId/candidates', getRankedCandidatesForJob);
router.get(  '/me', getMyRecruiterProfile);
router.patch('/me', updateMyRecruiterProfile);

export default router;
