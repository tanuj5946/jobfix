import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { getAnalyticsDashboard, getAnalyticsSummary, getMostRequestedSkills, getOverview, getUserDetail, listUsers, seedQuestionBank, SeedQuestionBankSchema } from '../controllers/admin.controller';

const router = Router();

router.use(authMiddleware, requireRole('admin'));
router.get('/users', listUsers);
router.get('/overview', getOverview);
router.get('/analytics', getAnalyticsDashboard);
router.get('/analytics/summary', getAnalyticsSummary);
router.get('/analytics/most-requested-skills', getMostRequestedSkills);
router.get('/users/:id', getUserDetail);
router.post('/questions/seed', validate(SeedQuestionBankSchema), seedQuestionBank);

export default router;
