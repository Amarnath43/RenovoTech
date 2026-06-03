import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './utils/errorHandler.js';

// ── Extend Request ────────────────────────────────
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone: string;
  };
}

// ── Verify Token from Cookie ──────────────────────
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // read from cookie instead of header
  const token = req.cookies?.accessToken;

  if (!token) {
    return next(createError('Not authenticated', 401));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthRequest['user'];

    req.user = decoded;
    next();
  } catch {
    // access token expired → let refresh token handle it
    return next(createError('Token expired', 401));
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

// ── Cookie Options ────────────────────────────────
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'strict' as const,
};

export const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,                        // 15 minutes
};

export const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days
};