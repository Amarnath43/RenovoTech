import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// ── Custom Error Interface ────────────────────────
export interface AppError extends Error {
  statusCode?: number;
}

// ── Create Error Helper ───────────────────────────
export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ── Global Error Handler ──────────────────────────
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${statusCode} - ${message} - ${req.method} ${req.originalUrl}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};