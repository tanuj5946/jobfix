import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload === 'string'
    || typeof payload.userId !== 'number'
    || typeof payload.email !== 'string'
    || typeof payload.role !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return { userId: payload.userId, email: payload.email, role: payload.role };
};
