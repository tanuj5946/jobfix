import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole }    from '../middleware/role.middleware';
import { getMatchesForJob, runMatch } from '../controllers/matches.controller';

const router = Router();

router.use(authMiddleware, requireRole('recruiter'));

router.get( '/job/:jobId',      getMatchesForJob);
router.post('/job/:jobId/run',  runMatch);

export default router;
