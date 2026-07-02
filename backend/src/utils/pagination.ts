interface LimitOptions {
  defaultLimit: number;
  maxLimit: number;
}

export const parseLimit = (limitParam: unknown, { defaultLimit, maxLimit }: LimitOptions): number =>
  Math.min(maxLimit, parseInt(limitParam as string) || defaultLimit);

export const parsePagination = (
  query: { page?: unknown; limit?: unknown },
  opts: LimitOptions,
): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = parseLimit(query.limit, opts);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};
