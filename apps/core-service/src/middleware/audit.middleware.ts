import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/** Writes structured, credential-free audit events for every auth request. */
export const authAuditLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'];
  req.requestId = typeof requestId === 'string' && requestId.length <= 128
    ? requestId
    : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const startedAt = Date.now();
  res.on('finish', () => {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'auth.request',
      requestId: req.requestId,
      method: req.method,
      path: req.baseUrl + req.path,
      statusCode: res.statusCode,
      userId: req.user?.userId ?? null,
      ip: req.ip,
      durationMs: Date.now() - startedAt,
    }));
  });

  next();
};
