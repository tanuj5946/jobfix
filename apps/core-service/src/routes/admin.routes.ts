import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { getUserDetail, listUsers, seedQuestionBank, SeedQuestionBankSchema } from '../controllers/admin.controller';

const router = Router();

router.use(authMiddleware, requireRole('admin'));
router.get('/users', listUsers);
router.get('/users/:id', getUserDetail);
router.post('/questions/seed', validate(SeedQuestionBankSchema), seedQuestionBank);

export default router;
