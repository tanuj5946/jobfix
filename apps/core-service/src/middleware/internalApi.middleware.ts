import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function internalApiMiddleware(req: Request, res: Response, next: NextFunction) {
  const value = req.header('authorization');
  const expected = `Bearer ${env.INTERNAL_API_KEY}`;
  const authorized = Boolean(value)
    && value!.length === expected.length
    && timingSafeEqual(Buffer.from(value!), Buffer.from(expected));

  if (!authorized) {
    res.status(401).json({ success: false, message: 'Unauthorized internal request' });
    return;
  }
  next();
}
