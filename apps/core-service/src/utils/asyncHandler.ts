import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so unhandled promise rejections
 * are forwarded to Express's error middleware instead of crashing.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
