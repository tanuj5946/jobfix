import { Router } from 'express';
import { internalApiMiddleware } from '../middleware/internalApi.middleware';
import {
  createAssessment, createAttempt, deleteQuestion, getAssessment, getAttempt,
  getCandidateHistory, getResult, persistEvaluation, searchQuestions, storeQuestions,
} from '../controllers/internal.controller';

const router = Router();
router.use(internalApiMiddleware);
router.post('/question-bank/search', searchQuestions);
router.post('/question-bank/questions/bulk', storeQuestions);
router.delete('/question-bank/questions/:id', deleteQuestion);
router.post('/assessments', createAssessment);
router.get('/assessments/:id', getAssessment);
router.get('/assessments/:id/result', getResult);
router.post('/assessments/:id/attempts', createAttempt);
router.get('/assessment-attempts/:id', getAttempt);
router.put('/assessments/:id/evaluation', persistEvaluation);
router.get('/candidates/:id/assessment-history', getCandidateHistory);
export default router;
