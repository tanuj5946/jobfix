import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma }          from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken }       from '../utils/jwt';
import { asyncHandler }    from '../utils/asyncHandler';

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

// ── Helpers ──────────────────────────────────────────────────

const buildUserResponse = (user: { id: number; role: string; name: string; email: string; createdAt: Date }) => ({
  id:        user.id,
  role:      user.role,
  name:      user.name,
  email:     user.email,
  createdAt: user.createdAt,
});

// ── Controllers ──────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyName } = req.body as z.infer<typeof RegisterSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      // Create the appropriate profile in the same transaction
      ...(role === 'candidate'
        ? { candidateProfile: { create: {} } }
        : { recruiterProfile: { create: { companyName: companyName! } } }),
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({
    success: true,
    data: { token, user: buildUserResponse(user) },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    success: true,
    data: { token, user: buildUserResponse(user) },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: buildUserResponse(user) });
});
