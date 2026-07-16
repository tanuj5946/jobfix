import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole }    from '../middleware/role.middleware';
import {
  createAssessment, getAssessmentById, listMyAssessments,
  submitAnswer, submitAssessment, getAssessmentResult,
} from '../controllers/assessments.controller';

const router = Router();

router.use(authMiddleware);

router.post('/',               requireRole('candidate'), createAssessment);
router.get( '/me',             requireRole('candidate'), listMyAssessments);
router.get( '/:id',               requireRole('candidate'), getAssessmentById);
router.post('/:id/answers',    requireRole('candidate'), submitAnswer);
router.post('/:id/submit',     requireRole('candidate'), submitAssessment);
router.get( '/:id/result',        requireRole('candidate'), getAssessmentResult);

export default router;
