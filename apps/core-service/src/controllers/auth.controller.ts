import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma }          from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken }       from '../utils/jwt';
import { asyncHandler }    from '../utils/asyncHandler';
import { env }             from '../config/env';
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  emailService,
  hashEmailVerificationToken,
  hashPasswordResetToken,
} from '../services/emailVerification.service';

// ── Zod schemas ──────────────────────────────────────────────

export const RegisterSchema = z.object({
  name:        z.string().min(2).max(150),
  email:       z.string().email(),
  password:    z.string().min(8),
  role:        z.enum(['candidate', 'recruiter']),
  companyName: z.string().min(2).max(200).optional(),
}).refine(
  (data) => data.role !== 'recruiter' || !!data.companyName,
  { message: 'companyName is required for recruiter accounts', path: ['companyName'] },
);

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(8),
});

export const VerificationTokenQuerySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const PasswordResetTokenQuerySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
});

// ── Helpers ──────────────────────────────────────────────────

const buildUserResponse = (user: { id: number; role: string; name: string; email: string; emailVerified: boolean; createdAt: Date }) => ({
  id:        user.id,
  role:      user.role,
  name:      user.name,
  email:     user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
});

const getVerificationUrl = (token: string) => {
  const url = new URL('/verify-email', env.FRONTEND_URL);
  url.searchParams.set('token', token);
  return url.toString();
};

const getPasswordResetUrl = (token: string) => {
  const url = new URL('/reset-password', env.FRONTEND_URL);
  url.searchParams.set('token', token);
  return url.toString();
};

// ── Controllers ──────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyName } = req.body as z.infer<typeof RegisterSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const verification = createEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      emailVerificationToken: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
      // Create the appropriate profile in the same transaction
      ...(role === 'candidate'
        ? { candidateProfile: { create: {} } }
        : { recruiterProfile: { create: { companyName: companyName! } } }),
    },
  });

  try {
    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl: getVerificationUrl(verification.token),
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });

  res.status(201).json({
    success: true,
    data: { accessToken, user: buildUserResponse(user) },
  });
});

const authenticateUser = async (
  credentials: z.infer<typeof LoginSchema>,
  requiredRole?: 'recruiter',
) => {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid || (requiredRole && user.role !== requiredRole)) return null;
  if (!user.emailVerified) return 'email_not_verified' as const;

  const accessToken = signToken({ id: user.id, email: user.email, role: user.role });
  return { accessToken, user: buildUserResponse(user) };
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const authenticated = await authenticateUser(
    req.body as z.infer<typeof LoginSchema>,
  );

  if (!authenticated) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  if (authenticated === 'email_not_verified') {
    res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    return;
  }

  res.json({ success: true, data: authenticated });
});

/**
 * Recruiter-specific entry point. It keeps JobFix's existing JWT payload and
 * therefore works with the current auth middleware and recruiter role guard.
 */
export const loginRecruiter = asyncHandler(async (req: Request, res: Response) => {
  const authenticated = await authenticateUser(
    req.body as z.infer<typeof LoginSchema>,
    'recruiter',
  );

  if (!authenticated) {
    res.status(401).json({ success: false, message: 'Invalid recruiter credentials' });
    return;
  }

  if (authenticated === 'email_not_verified') {
    res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });
    return;
  }

  res.json({ success: true, data: authenticated });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: buildUserResponse(user) });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ success: false, message: 'Verification token is required' });
    return;
  }

  const result = await prisma.user.updateMany({
    where: {
      emailVerificationToken: hashEmailVerificationToken(token),
      emailVerificationExpiresAt: { gt: new Date() },
    },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  if (result.count === 0) {
    res.status(400).json({ success: false, message: 'Verification link is invalid or has expired' });
    return;
  }

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  if (user.emailVerified) {
    res.status(400).json({ success: false, message: 'Email is already verified' });
    return;
  }

  const verification = createEmailVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    },
  });

  await emailService.sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl: getVerificationUrl(verification.token),
  });

  res.json({ success: true, message: 'Verification email sent' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as z.infer<typeof ForgotPasswordSchema>;
  const user = await prisma.user.findUnique({ where: { email } });
  const message = 'If an account exists for this email, a password reset link has been sent.';

  // Do not reveal whether an email address is registered.
  if (!user) {
    res.json({ success: true, message });
    return;
  }

  const reset = createPasswordResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: reset.tokenHash,
      passwordResetExpiresAt: reset.expiresAt,
    },
  });

  await emailService.sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl: getPasswordResetUrl(reset.token),
  });

  res.json({ success: true, message });
});

export const validatePasswordResetToken = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ success: false, message: 'Reset token is required' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashPasswordResetToken(token),
      passwordResetExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    res.status(400).json({ success: false, message: 'Password reset link is invalid or has expired' });
    return;
  }

  res.json({ success: true, message: 'Password reset token is valid' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as z.infer<typeof ResetPasswordSchema>;
  const passwordHash = await hashPassword(password);
  const result = await prisma.user.updateMany({
    where: {
      passwordResetToken: hashPasswordResetToken(token),
      passwordResetExpiresAt: { gt: new Date() },
    },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  if (result.count === 0) {
    res.status(400).json({ success: false, message: 'Password reset link is invalid or has expired' });
    return;
  }

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});
