import { Router } from 'express';
import authRoutes        from './auth.routes';
import candidatesRoutes  from './candidates.routes';
import recruitersRoutes  from './recruiters.routes';
import jobsRoutes        from './jobs.routes';
import skillsRoutes      from './skills.routes';
import assessmentsRoutes from './assessments.routes';
import matchesRoutes     from './matches.routes';
import careerCoachRoutes from './careerCoach.routes';
import adminRoutes       from './admin.routes';
import companiesRoutes   from './companies.routes';
import applicationsRoutes from './applications.routes';

const router = Router();

router.use('/auth',         authRoutes);
router.use('/candidate',    candidatesRoutes);
router.use('/candidates',   candidatesRoutes);
router.use('/recruiters',   recruitersRoutes);
router.use('/jobs',         jobsRoutes);
router.use('/skills',       skillsRoutes);
router.use('/assessments',  assessmentsRoutes);
router.use('/matches',      matchesRoutes);
router.use('/career-coach', careerCoachRoutes);
router.use('/admin',        adminRoutes);
router.use('/companies',    companiesRoutes);
router.use('/applications', applicationsRoutes);

export default router;
