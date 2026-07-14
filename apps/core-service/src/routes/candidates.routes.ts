import { Router } from 'express';
import multer       from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole }    from '../middleware/role.middleware';
import {
  getMyProfile, updateMyProfile,
  uploadResume,
  getMyCandidateSkills, confirmSkills, getMyJobRecommendations,
  createCandidateAssessment,
  getCandidateAssessment,
  getCandidateDashboard,
  getCandidateResults,
  getCandidateResume,
  getSuggestedRoles,
  selectRole,
  selectSkills,
  submitCandidateAssessment,
  uploadCandidateResume,
} from '../controllers/candidates.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(authMiddleware, requireRole('candidate'));

router.get( '/me',              getMyProfile);
router.patch('/me',             updateMyProfile);
router.post( '/me/resume',      upload.single('resume'), uploadResume);
router.get(  '/me/skills',      getMyCandidateSkills);
router.post( '/me/skills/confirm', confirmSkills);
router.get(  '/me/job-recommendations', getMyJobRecommendations);

router.post('/resume/upload', upload.single('resume'), uploadCandidateResume);
router.get( '/resume', getCandidateResume);
router.get( '/suggested-roles', getSuggestedRoles);
router.post('/select-role', selectRole);
router.post('/select-skills', selectSkills);
router.post('/assessment/create', createCandidateAssessment);
router.get( '/assessment/:id', getCandidateAssessment);
router.post('/assessment/:id/submit', submitCandidateAssessment);
router.post('/assessment/submit', submitCandidateAssessment);
router.get( '/results', getCandidateResults);
router.get( '/dashboard', getCandidateDashboard);

export default router;
