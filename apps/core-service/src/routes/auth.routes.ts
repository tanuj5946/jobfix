import { Router } from 'express';
import { validate }          from '../middleware/validate.middleware';
import { authMiddleware }    from '../middleware/auth.middleware';
import { resendVerificationRateLimit } from '../middleware/resendVerificationRateLimit.middleware';
import { authAuditLogger } from '../middleware/audit.middleware';
import { authRateLimit } from '../middleware/rateLimit.middleware';
import {
  register,
  login,
  loginRecruiter,
  logout,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  validatePasswordResetToken,
  resetPassword,
  sendPreRegistrationVerification,
  checkPreRegistrationToken,
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerificationTokenQuerySchema,
  PasswordResetTokenQuerySchema,
} from '../controllers/auth.controller';

const router = Router();

router.use(authAuditLogger);
router.use(authRateLimit);

// ── Pre-registration email verification ──────────────────────
// Step 1: Send verification email without creating a user account
router.post('/send-pre-registration-verification', validate(RegisterSchema), sendPreRegistrationVerification);
// Step 2: Polling endpoint — returns { verified: true } once the link is clicked
router.get('/check-pre-registration-token', validate(VerificationTokenQuerySchema, 'query'), checkPreRegistrationToken);

// ── Standard auth ────────────────────────────────────────────
// Step 3: Create the user account (requires a verified pending entry)
router.post('/register', validate(RegisterSchema), register);
router.post('/login',    validate(LoginSchema),    login);
router.post('/recruiter/login', validate(LoginSchema), loginRecruiter);
router.post('/logout', logout);
router.get( '/me',       authMiddleware,            getMe);
router.get( '/verify-email', validate(VerificationTokenQuerySchema, 'query'), verifyEmail);
router.post(
  '/resend-verification',
  authMiddleware,
  resendVerificationRateLimit,
  resendVerification,
);
router.post('/forgot-password', validate(ForgotPasswordSchema), forgotPassword);
router.get('/reset-password', validate(PasswordResetTokenQuerySchema, 'query'), validatePasswordResetToken);
router.post('/reset-password', validate(ResetPasswordSchema), resetPassword);

export default router;
