import { Router } from 'express';
import { validate }          from '../middleware/validate.middleware';
import { authMiddleware }    from '../middleware/auth.middleware';
import {
  register,
  login,
  loginRecruiter,
  getMe,
  RegisterSchema,
  LoginSchema,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', validate(RegisterSchema), register);
router.post('/login',    validate(LoginSchema),    login);
router.post('/recruiter/login', validate(LoginSchema), loginRecruiter);
router.get( '/me',       authMiddleware,            getMe);

export default router;
