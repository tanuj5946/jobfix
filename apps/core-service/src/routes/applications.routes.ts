import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { applyToJob, getMyApplications } from '../controllers/applications.controller';

const router = Router();
router.use(authMiddleware, requireRole('candidate'));
router.post('/jobs/:jobId', applyToJob);
router.get('/me', getMyApplications);

export default router;
