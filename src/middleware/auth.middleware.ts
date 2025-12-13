import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.util';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }

    const token = parts[1];
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
}

