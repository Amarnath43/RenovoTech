import rateLimit from 'express-rate-limit';

// ── OTP Rate Limiter ──────────────────────────────
// Max 3 OTP requests per phone per hour
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.body.phone,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── API Rate Limiter ──────────────────────────────
// Max 100 requests per IP per 15 minutes
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});