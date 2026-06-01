import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/errorHandler.js';

// ── Extend Request to include user ────────────────
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone: string;
  };
}

// ── Verify JWT Token ──────────────────────────────
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthRequest['user'];

    req.user = decoded;
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
};

// ── Require Specific Role ─────────────────────────
export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Access denied', 403));
    }
    next();
  };