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
  userId: string,
  refreshToken: string,
  ipAddress: string,
  deviceInfo: string,
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
  token: string,
  ipAddress: string,
  deviceInfo: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  try {
    // 1. verify token signature
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string; role: string; phone: string };

    // 2. find all tokens for this user
    const storedTokens = await RefreshToken.find({ userId: decoded.id });
    if (!storedTokens.length) return null;

    // 3. find matching token
    let matchedToken = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(token, stored.tokenHash); // ← tokenHash
      if (isMatch) { matchedToken = stored; break; }
    }
    if (!matchedToken) return null;

    // 4. update lastUsedAt before deleting
    await RefreshToken.findByIdAndUpdate(matchedToken._id, {
      lastUsedAt: new Date(),
    });

    // 5. delete old token → rotation
    await RefreshToken.findByIdAndDelete(matchedToken._id);

    // 6. generate new tokens
    const payload = {
      id: decoded.id,
      role: decoded.role,
      phone: decoded.phone,
    };
    const tokens = generateTokens(payload);

    // 7. save new refresh token
    await saveRefreshToken(
      decoded.id,
      tokens.refreshToken,
      ipAddress,
      deviceInfo,
    );

    return tokens;
  } catch {
    return null;
  }
};

// ── Clear Refresh Token (Single Device Logout) ────
export const clearRefreshToken = async (
  token: string,
  userId: string,
): Promise<void> => {
  const storedTokens = await RefreshToken.find({ userId });
  for (const stored of storedTokens) {
    const isMatch = await bcrypt.compare(token, stored.tokenHash); // ← tokenHash
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