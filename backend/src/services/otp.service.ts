import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import redis from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { maskPhone } from '../utils/mask.js';

// ── Constants ─────────────────────────────────────
const OTP_EXPIRY_SECS  = 10 * 60;
const MAX_ATTEMPTS     = 5;
const BLOCK_SECS       = 5 * 60;
const MAX_REQUESTS     = 5;
const REQUEST_WIN_SECS = 60 * 60;

// ── Redis Keys ────────────────────────────────────
const keys = {
  otp:      (phone: string) => `otp:${phone}`,
  attempts: (phone: string) => `otp:attempts:${phone}`,
  block:    (phone: string) => `otp:block:${phone}`,
  requests: (phone: string) => `otp:requests:${phone}`,
};

// ── Types ─────────────────────────────────────────
interface OtpData {
  hash:      string;
  ipAddress: string;
  createdAt: number;
}

interface OtpResult {
  success: boolean;
  message: string;
}

// ── Helpers ───────────────────────────────────────
const generateOTP = (): string =>
  randomInt(100000, 1000000).toString();


const getOtpData = async (
  phone: string
): Promise<OtpData | null> => {
  const stored = await redis.get(keys.otp(phone));
  if (!stored) return null;
  return JSON.parse(stored) as OtpData;
};

const setOtpData = async (
  phone: string,
  data:  OtpData,
): Promise<void> => {
  await redis.setex(
    keys.otp(phone),
    OTP_EXPIRY_SECS,
    JSON.stringify(data),
  );
};

const isBlocked = async (
  phone: string
): Promise<{ blocked: boolean; ttl: number }> => {
  const blocked = await redis.get(keys.block(phone));
  if (!blocked) return { blocked: false, ttl: 0 };
  const ttl = await redis.ttl(keys.block(phone));
  return { blocked: true, ttl };
};

const blockPhone = async (phone: string): Promise<void> => {
  await redis.setex(keys.block(phone), BLOCK_SECS, '1');
};

const isRateLimited = async (
  phone: string
): Promise<{ limited: boolean; ttl: number }> => {
  const count = await redis.get(keys.requests(phone));
  if (!count || parseInt(count) < MAX_REQUESTS) {
    return { limited: false, ttl: 0 };
  }
  const ttl = await redis.ttl(keys.requests(phone));
  return { limited: true, ttl };
};

const incrementRequestCount = async (phone: string): Promise<void> => {
  const key   = keys.requests(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, REQUEST_WIN_SECS);
  }
};

// ── Send OTP ──────────────────────────────────────
export const sendOTP = async (
  phone:     string,
  ipAddress: string,
): Promise<OtpResult> => {
  try {
    // 1. check block
    const { blocked, ttl } = await isBlocked(phone);
    if (blocked) {
      return {
        success: false,
        message: `Too many wrong attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      };
    }

    // 2. check rate limit
    const { limited, ttl: requestTtl } = await isRateLimited(phone);
    if (limited) {
      return {
        success: false,
        message: `OTP request limit reached. Try again in ${Math.ceil(requestTtl / 60)} minutes.`,
      };
    }

    // 3. generate OTP
    const otp  = generateOTP();
    const hash = await bcrypt.hash(otp, 10);

    // 4. store OTP data
    await setOtpData(phone, {
      hash,
      ipAddress,
      createdAt: Date.now(),
    });

    // 5. reset attempts counter
    await redis.del(keys.attempts(phone));

    // 6. increment request count
    await incrementRequestCount(phone);

    // 7. send SMS
    if (process.env.NODE_ENV === 'production') {
      // await twilioClient.messages.create({
      //   body: `Your RenovoTech OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to:   `+91${phone}`,
      // });
      logger.info(`[OTP] Sent to ${maskPhone(phone)} from IP ${ipAddress}`);
    } else {
      logger.info(`[OTP] DEV mode — OTP for ${maskPhone(phone)}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };

  } catch (err) {
    logger.error(`[OTP] Send failed for ${maskPhone(phone)}: ${err}`);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
    };
  }
};

// ── Verify OTP ────────────────────────────────────
export const verifyOTP = async (
  phone: string,
  otp:   string,
): Promise<OtpResult> => {
  try {
    // 1. check block
    const { blocked, ttl } = await isBlocked(phone);
    if (blocked) {
      return {
        success: false,
        message: `Too many wrong attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      };
    }

    // 2. get OTP data
    const data = await getOtpData(phone);
    if (!data) {
      return {
        success: false,
        message: 'OTP expired. Please request a new one.',
      };
    }

    // 3. atomic attempt increment
    const attempts = await redis.incr(keys.attempts(phone));
    if (attempts === 1) {
      await redis.expire(keys.attempts(phone), OTP_EXPIRY_SECS);
    }

    // 4. check max attempts
    if (attempts > MAX_ATTEMPTS) {
      await blockPhone(phone);
      await redis.del(keys.otp(phone));
      await redis.del(keys.attempts(phone));
      return {
        success: false,
        message: 'Too many wrong attempts. Try again in 5 minutes.',
      };
    }

    // 5. verify OTP
    const isMatch = await bcrypt.compare(otp, data.hash);

    if (!isMatch) {
      const remainingAttempts = MAX_ATTEMPTS - attempts;

      if (remainingAttempts <= 0) {
        await blockPhone(phone);
        await redis.del(keys.otp(phone));
        await redis.del(keys.attempts(phone));
        return {
          success: false,
          message: 'Too many wrong attempts. Try again in 5 minutes.',
        };
      }

      logger.warn(
        `[OTP] Wrong attempt for ${maskPhone(phone)}. ${remainingAttempts} remaining.`
      );

      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      };
    }

    // 6. correct → cleanup
    await redis.del(keys.otp(phone));
    await redis.del(keys.attempts(phone));

    logger.info(`[OTP] Verified for ${maskPhone(phone)}`);

    return {
      success: true,
      message: 'OTP verified successfully',
    };

  } catch (err) {
    logger.error(`[OTP] Verify failed for ${maskPhone(phone)}: ${err}`);
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.',
    };
  }
};