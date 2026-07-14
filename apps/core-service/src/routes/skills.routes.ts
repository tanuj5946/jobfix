import { Router } from 'express';
import { listSkills, getSkillById } from '../controllers/skills.controller';

const router = Router();

// Skills are publicly readable (needed on register/job-post screens)
router.get('/',    listSkills);
router.get('/:id', getSkillById);

export default router;
