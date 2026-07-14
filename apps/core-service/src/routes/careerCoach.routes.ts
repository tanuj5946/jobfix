import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole }    from '../middleware/role.middleware';
import { getImprovementPlan, getPlanHistory, markRecommendationComplete } from '../controllers/careerCoach.controller';

const router = Router();

router.use(authMiddleware, requireRole('candidate'));

router.post( '/plan',              getImprovementPlan);          // POST triggers AI plan generation + persistence
router.get(  '/plan',              getPlanHistory);              // GET retrieves saved recommendations
router.patch('/plan/:id/complete', markRecommendationComplete);

export default router;
