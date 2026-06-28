import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { createError } from '../utils/errorHandler.js';

export const validateBody = (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Invalid input';
      return next(createError(msg, 400));
    }
    req.body = result.data;
    next();
  };

export const validateParam = (param: string, schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params[param]);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? `Invalid ${param}`;
      return next(createError(msg, 400));
    }
    next();
  };