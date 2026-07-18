import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      /**
       * Verified JWT claims. `userId` is retained for existing controllers
       * that predate the token's `id` claim.
       */
      user?: JwtPayload & { userId: number };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    // Attach verified JWT claims; the compatibility alias avoids controller changes.
    req.user = { ...payload, userId: payload.id };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Kept as an alias so existing route modules remain compatible.
export const authMiddleware = authenticate;
