import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: Record<string, string[] | undefined> | undefined;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation error';
    errors = err.flatten().fieldErrors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with those values already exists';
  } else if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON request body';
  }

  if (statusCode >= 500) {
    console.error('[Error]', { requestId: req.requestId, err });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });
};
