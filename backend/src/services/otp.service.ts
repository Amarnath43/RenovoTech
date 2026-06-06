import bcrypt from 'bcryptjs';
import redis from '../config/redis.js';
import { logger } from '../utils/logger.js';

// ── Constants ─────────────────────────────────────
const OTP_EXPIRY_SECS = 10 * 60;   // 10 minutes
const MAX_ATTEMPTS = 5;          // wrong attempts allowed
const BLOCK_SECS = 5 * 60;    // 5 minute block
const MAX_REQUESTS = 5;          // per hour
const REQUEST_WIN_SECS = 60 * 60;   // 1 hour window

// ── Redis Keys ────────────────────────────────────
const keys = {
    otp: (phone: string) => `otp:${phone}`,
    block: (phone: string) => `otp:block:${phone}`,
    requests: (phone: string) => `otp:requests:${phone}`,
};

// ── Types ─────────────────────────────────────────
interface OtpData {
    hash: string;
    attempts: number;
    ipAddress: string;
    createdAt: number;
}

interface OtpResult {
    success: boolean;
    message: string;
}

// ── Helpers ───────────────────────────────────────
const generateOTP = (): string =>
    Math.floor(1000 + Math.random() * 9000).toString();

const getOtpData = async (
    phone: string
): Promise<OtpData | null> => {
    const stored = await redis.get(keys.otp(phone));
    if (!stored) return null;
    return JSON.parse(stored) as OtpData;
};

const setOtpData = async (
    phone: string,
    data: OtpData,
    ttlSecs: number = OTP_EXPIRY_SECS,
): Promise<void> => {
    await redis.setex(
        keys.otp(phone),
        ttlSecs,
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
    const count = await redis.incr(keys.requests(phone));
    // set TTL only on first request → fixed 1 hour window
    if (count === 1) {
        await redis.expire(keys.requests(phone), REQUEST_WIN_SECS);
    }
};

// ── Send OTP ──────────────────────────────────────
export const sendOTP = async (
    phone: string,
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
        const otp = generateOTP();
        const hash = await bcrypt.hash(otp, 10);

        // 4. store in Redis
        await setOtpData(phone, {
            hash,
            attempts: 0,
            ipAddress,
            createdAt: Date.now(),
        });

        // 5. increment request count
        await incrementRequestCount(phone);

        // 6. send SMS via Twilio
        // await twilioClient.messages.create({
        //   body: `Your RenovoTech OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to:   `+91${phone}`,
        // });

        logger.info(`[OTP] Sent to ${phone} from IP ${ipAddress}`);

        return {
            success: true,
            message: 'OTP sent successfully',
        };

    } catch (err) {
        logger.error(`[OTP] Send failed for ${phone}: ${err}`);
        return {
            success: false,
            message: 'Failed to send OTP. Please try again.',
        };
    }
};

// ── Verify OTP ────────────────────────────────────
export const verifyOTP = async (
    phone: string,
    otp: string,
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

        // 3. check attempts
        if (data.attempts >= MAX_ATTEMPTS) {
            await blockPhone(phone);
            await redis.del(keys.otp(phone));
            return {
                success: false,
                message: 'Too many wrong attempts. Try again in 5 minutes.',
            };
        }

        // 4. verify OTP
        const isMatch = await bcrypt.compare(otp, data.hash);

        if (!isMatch) {
            const remainingAttempts = MAX_ATTEMPTS - data.attempts - 1;

            // update attempts
            await setOtpData(phone, {
                ...data,
                attempts: data.attempts + 1,
            });

            // block if no attempts remaining
            if (remainingAttempts === 0) {
                await blockPhone(phone);
                await redis.del(keys.otp(phone));
                return {
                    success: false,
                    message: 'Too many wrong attempts. Try again in 5 minutes.',
                };
            }

            logger.warn(
                `[OTP] Wrong attempt for ${phone}. ${remainingAttempts} remaining.`
            );

            return {
                success: false,
                message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
            };
        }

        // 5. correct → cleanup
        await redis.del(keys.otp(phone));

        logger.info(`[OTP] Verified successfully for ${phone}`);

        return {
            success: true,
            message: 'OTP verified successfully',
        };

    } catch (err) {
        logger.error(`[OTP] Verify failed for ${phone}: ${err}`);
        return {
            success: false,
            message: 'Failed to verify OTP. Please try again.',
        };
    }
};