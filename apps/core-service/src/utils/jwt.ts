import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRES } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

  if (
    typeof payload === 'string'
    || typeof payload.id !== 'number'
    || typeof payload.email !== 'string'
    || typeof payload.role !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return { id: payload.id, email: payload.email, role: payload.role };
};
