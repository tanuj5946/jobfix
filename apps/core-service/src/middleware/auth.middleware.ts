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
  const token = req.cookies.accessToken;

  if (typeof token !== 'string' || !token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

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
