import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/errorHandler.js';
import { User } from '../models/User.js';
import { sendOTP, verifyOTP } from '../services/otp.service.js';
import {
  generateTokens,
  saveRefreshToken,
  rotateRefreshToken,
  clearRefreshToken,
  clearAllRefreshTokens,
} from '../services/token.service.js';
import { cookieOptions } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

//Send OTP
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw createError('Valid 10-digit phone number required', 400);
  }

  const result = await sendOTP(phone, req.ip || 'unknown');
  if (!result.success) throw createError(result.message, 429);

  res.json({ success: true, message: result.message });
});

//Verify OTP
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) throw createError('Phone and OTP are required', 400);

  const result = await verifyOTP(phone, otp);
  if (!result.success) throw createError(result.message, 400);

  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone, role: 'customer' });

  if (!user.isActive) {
    throw createError('Your account has been deactivated. Contact support.', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const payload = {
    id:    user._id.toString(),
    role:  user.role,
    phone: user.phone,
  };
  const tokens = generateTokens(payload);

  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  await saveRefreshToken(
    user._id.toString(),
    tokens.refreshToken,
    req.ip || 'unknown',
    deviceInfo,
  );

  res.cookie('accessToken',  tokens.accessToken,  cookieOptions.access);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions.refresh);

  logger.info(`[AUTH] Login success — role: ${user.role}`);

  res.json({
    success: true,
    message: 'Logged in successfully',
    user: {
      id:                user._id,
      phone:             user.phone,
      name:              user.name,
      role:              user.role,
      isProfileComplete: user.isProfileComplete,
    },
  });
});

//Refresh Token
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw createError('No refresh token provided', 401);

  const tokens = await rotateRefreshToken(
    token,
    req.ip || 'unknown',
    req.headers['user-agent'] || 'Unknown Device',
  );
  if (!tokens) throw createError('Invalid or expired refresh token', 401);

  res.cookie('accessToken',  tokens.accessToken,  cookieOptions.access);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions.refresh);

  res.json({ success: true, message: 'Token refreshed' });
});

//Logout (Single Device) 
export const logout = asyncHandler(async (req, res) => {
  const token  = req.cookies?.refreshToken;
  const userId = req.user?.id;

  if (token && userId) await clearRefreshToken(token, userId);

  res.clearCookie('accessToken',  cookieOptions.access);
  res.clearCookie('refreshToken', cookieOptions.refresh);

  res.json({ success: true, message: 'Logged out successfully' });
});

//Logout All Devices
export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (userId) await clearAllRefreshTokens(userId);

  res.clearCookie('accessToken',  cookieOptions.access);
  res.clearCookie('refreshToken', cookieOptions.refresh);

  res.json({ success: true, message: 'Logged out from all devices' });
});

//Get Current User
export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw createError('Not authenticated', 401);

  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);

  res.json({
    success: true,
    user: {
      id:                user._id,
      phone:             user.phone,
      name:              user.name,
      role:              user.role,
      isProfileComplete: user.isProfileComplete,
    },
  });
});