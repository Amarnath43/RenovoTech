import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  refresh,
  logout,
  logoutAll,
  getMe,
} from '../controllers/auth.controller.js';
import { verifyToken }    from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { otpRateLimiter } from '../middleware/rateLimiter.js';
import { sendOtpSchema,verifyOtpSchema } from '../validators/schemas.js';

const router = Router();

router.post('/send-otp',   otpRateLimiter,validateBody(sendOtpSchema), sendOtp);
router.post('/verify-otp', otpRateLimiter, validateBody(verifyOtpSchema),verifyOtp);
router.post('/refresh',    refresh);

router.get('/me',          verifyToken, getMe);
router.post('/logout',     verifyToken, logout);
router.post('/logout-all', verifyToken, logoutAll);

export default router;