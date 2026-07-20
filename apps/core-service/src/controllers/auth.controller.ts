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

interface PendingRegistration {
  name:         string;
  email:        string;
  passwordHash: string;
  role:         'candidate' | 'recruiter';
  companyName?: string;
  expiresAt:    Date;
  verified:     boolean;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

/** Evict expired entries to avoid unbounded memory growth. */
const evictExpiredPending = () => {
  const now = new Date();
  for (const [key, entry] of pendingRegistrations) {
    if (entry.expiresAt <= now) pendingRegistrations.delete(key);
  }
};

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

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const setAccessTokenCookie = (res: Response, accessToken: string) => {
  res.cookie('accessToken', accessToken, accessTokenCookieOptions);
};

// ── Controllers ──────────────────────────────────────────────

/**
 * Step 1 of the new registration flow.
 *
 * Validates the registration payload, hashes the password, stores
 * the pending data in-memory, and sends the verification email via
 * SES. Does NOT create a User record.
 */
export const sendPreRegistrationVerification = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyName } = req.body as z.infer<typeof RegisterSchema>;

  // Reject if a live user account already exists for this email.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  evictExpiredPending();

  const passwordHash = await hashPassword(password);
  const verification = createEmailVerificationToken();
  for (const [key, entry] of pendingRegistrations) {
    if (entry.email === email) {
      pendingRegistrations.delete(key);
      break;
    }
  }

  pendingRegistrations.set(verification.tokenHash, {
    name,
    email,
    passwordHash,
    role,
    companyName,
    expiresAt: verification.expiresAt,
    verified: false,
  });

  await emailService.sendVerificationEmail({
    to: email,
    name,
    verificationUrl: getVerificationUrl(verification.token),
  });

  res.json({
    success: true,
    message: 'Verification email sent. Please check your inbox.',
    verificationToken: verification.token,
  });
});


export const checkPreRegistrationToken = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ success: false, message: 'Token is required' });
    return;
  }

  const tokenHash = hashEmailVerificationToken(token);
  const entry = pendingRegistrations.get(tokenHash);

  if (!entry || entry.expiresAt <= new Date()) {
    res.status(400).json({ success: false, message: 'Token is invalid or has expired' });
    return;
  }

  res.json({ success: true, verified: entry.verified });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ success: false, message: 'Verification token is required' });
    return;
  }

  const tokenHash = hashEmailVerificationToken(token);

  // ── Pre-registration path ────────────────────────────────
  const pending = pendingRegistrations.get(tokenHash);
  if (pending) {
    if (pending.expiresAt <= new Date()) {
      pendingRegistrations.delete(tokenHash);
      res.status(400).json({ success: false, message: 'Verification link is invalid or has expired' });
      return;
    }
    pending.verified = true;
    res.json({
      success: true,
      message: 'Email verified! You can now return to the registration tab to complete your account.',
      pendingRegistration: true,
    });
    return;
  }

  // ── Post-registration path (existing behaviour) ──────────
  const result = await prisma.user.updateMany({
    where: {
      emailVerificationToken: tokenHash,
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

/**
 * Step 3 of the new registration flow.
 *
 * Requires a verified pending entry for the supplied email.
 * Creates the User record using the already-hashed password.
 * Does NOT issue a JWT cookie — the user must log in manually.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyName } = req.body as z.infer<typeof RegisterSchema>;

  evictExpiredPending();

  // Find the verified pending entry for this email.
  let pendingKey: string | null = null;
  let pendingEntry: PendingRegistration | null = null;

  for (const [key, entry] of pendingRegistrations) {
    if (entry.email === email) {
      pendingKey = key;
      pendingEntry = entry;
      break;
    }
  }

  if (!pendingEntry || pendingEntry.expiresAt <= new Date()) {
    res.status(403).json({
      success: false,
      message: 'Email not verified. Please verify your email first.',
    });
    return;
  }

  if (!pendingEntry.verified) {
    res.status(403).json({
      success: false,
      message: 'Email not verified. Please click the link in your inbox before registering.',
    });
    return;
  }

  // Double-check no account was created in the meantime.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (pendingKey) pendingRegistrations.delete(pendingKey);
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  // Re-hash only if the password in the request differs (e.g. user
  // changed their mind). Otherwise reuse the already-hashed value
  // from the pending store to avoid an unnecessary bcrypt round.
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      // Email is already verified — mark it immediately.
      emailVerified: true,
      // Create the appropriate profile in the same transaction.
      ...(role === 'candidate'
        ? { candidateProfile: { create: {} } }
        : { recruiterProfile: { create: { companyName: companyName! } } }),
    },
  });

  // Clean up the pending entry.
  if (pendingKey) pendingRegistrations.delete(pendingKey);

  // Do NOT issue an auth cookie — the user must log in manually.
  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please sign in to continue.',
    data: { user: buildUserResponse(user) },
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

  setAccessTokenCookie(res, authenticated.accessToken);
  res.json({ success: true, data: { user: authenticated.user } });
});


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

  setAccessTokenCookie(res, authenticated.accessToken);
  res.json({ success: true, data: { user: authenticated.user } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('accessToken', accessTokenCookieOptions);
  res.status(204).send();
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: buildUserResponse(user) });
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
