import { createError } from './errorHandler.js';

/**
 * Parses optional startDate/endDate query strings into a Mongo range filter,
 * clamped to day boundaries (00:00:00.000 - 23:59:59.999 UTC).
 * Returns undefined if neither bound is provided.
 */
export const parseDateRangeFilter = (
  startDate?: string,
  endDate?: string,
): { $gte?: Date; $lte?: Date } | undefined => {
  if (!startDate && !endDate) return undefined;

  const filter: { $gte?: Date; $lte?: Date } = {};

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) throw createError('Invalid startDate', 400);
    start.setUTCHours(0, 0, 0, 0);
    filter.$gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) throw createError('Invalid endDate', 400);
    end.setUTCHours(23, 59, 59, 999);
    filter.$lte = end;
  }

  return filter;
};
