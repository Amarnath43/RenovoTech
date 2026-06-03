import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { RefreshToken } from '../models/RefreshToken.js';

// ── Generate Tokens ───────────────────────────────
export const generateTokens = (payload: {
  id: string;
  role: string;
  phone: string;
}) => {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// ── Save Refresh Token ────────────────────────────
export const saveRefreshToken = async (
  userId:       string,
  refreshToken: string,
  ipAddress:    string,
  deviceInfo:   string,
): Promise<void> => {
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    tokenHash,
    ipAddress,
    deviceInfo,
    expiresAt,
    lastUsedAt: new Date(),
  });
};

// ── Rotate Refresh Token ──────────────────────────
export const rotateRefreshToken = async (
  token:      string,
  ipAddress:  string,
  deviceInfo: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. verify token signature
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string; role: string; phone: string };

    // 2. find all tokens for this user
    const storedTokens = await RefreshToken.find(
      { userId: decoded.id },
      null,
      { session }
    );
    if (!storedTokens.length) {
      await session.abortTransaction();
      return null;
    }

    // 3. find matching token
    let matchedToken = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(token, stored.tokenHash);
      if (isMatch) { matchedToken = stored; break; }
    }
    if (!matchedToken) {
      await session.abortTransaction();
      return null;
    }

    // 4. delete old token
    await RefreshToken.findByIdAndDelete(
      matchedToken._id,
      { session }
    );

    // 5. generate new tokens
    const payload = {
      id:    decoded.id,
      role:  decoded.role,
      phone: decoded.phone,
    };
    const tokens = generateTokens(payload);

    // 6. create new refresh token
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create(
      [{
        userId:     decoded.id,
        tokenHash,
        ipAddress,
        deviceInfo,
        expiresAt,
        lastUsedAt: new Date(),
      }],
      { session }
    );

    // 7. commit
    await session.commitTransaction();
    return tokens;

  } catch {
    await session.abortTransaction();
    return null;
  } finally {
    session.endSession();
  }
};

// ── Clear Refresh Token (Single Device Logout) ────
export const clearRefreshToken = async (
  token:  string,
  userId: string,
): Promise<void> => {
  const storedTokens = await RefreshToken.find({ userId });
  for (const stored of storedTokens) {
    const isMatch = await bcrypt.compare(token, stored.tokenHash);
    if (isMatch) {
      await RefreshToken.findByIdAndDelete(stored._id);
      break;
    }
  }
};

// ── Clear All Sessions (Logout All Devices) ───────
export const clearAllRefreshTokens = async (
  userId: string,
): Promise<void> => {
  await RefreshToken.deleteMany({ userId });
};