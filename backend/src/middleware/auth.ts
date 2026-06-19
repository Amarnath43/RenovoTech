import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/errorHandler.js';


// ── Verify Token from Cookie ──────────────────────
export const verifyToken = (
  req: Request,
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
    ) as Request['user'];

    req.user = decoded;
    next();
  } catch {
    // access token expired → let refresh token handle it
    return next(createError('Token expired', 401));
  }
};

// ── Require Specific Role ─────────────────────────
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createError('Access denied', 403));
    }
    next();
  };

// ── Cookie Options ────────────────────────────────
export const cookieOptions = {
  access: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge:   15 * 60 * 1000,          // 15 minutes
  },
  refresh: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

