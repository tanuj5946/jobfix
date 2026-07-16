import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  createCompany,
  deleteMyCompany,
  getMyCompany,
  updateMyCompany,
} from '../controllers/companies.controller';

const router = Router();

router.use(authMiddleware, requireRole('recruiter'));
router.get('/me', getMyCompany);
router.post('/', validate(CreateCompanySchema), createCompany);
router.patch('/me', validate(UpdateCompanySchema), updateMyCompany);
router.delete('/me', deleteMyCompany);

export default router;
