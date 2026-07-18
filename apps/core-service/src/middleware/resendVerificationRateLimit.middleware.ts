import type { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 3;

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const attemptsByUserId = new Map<number, RateLimitEntry>();

/** Limits verification-email sends per authenticated account, not per IP. */
export const resendVerificationRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const userId = req.user?.userId;
  if (!userId) {
    next();
    return;
  }

  const now = Date.now();
  const current = attemptsByUserId.get(userId);
  const entry = !current || current.resetAt <= now
    ? { attempts: 0, resetAt: now + WINDOW_MS }
    : current;

  if (entry.attempts >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(429).json({
      success: false,
      message: 'Too many verification email requests. Please try again later.',
    });
    return;
  }

  entry.attempts += 1;
  attemptsByUserId.set(userId, entry);
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (MAX_REQUESTS - entry.attempts).toString());
  next();
};
