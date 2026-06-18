import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  refresh,
  logout,
  logoutAll,
  getMe,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/send-otp',   sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh',    refresh);

router.get('/me',          verifyToken, getMe);
router.post('/logout',     verifyToken, logout);
router.post('/logout-all', verifyToken, logoutAll);

export default router;