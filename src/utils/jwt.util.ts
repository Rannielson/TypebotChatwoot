import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JWTPayload {
  userId: number;
  email: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    return decoded as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

