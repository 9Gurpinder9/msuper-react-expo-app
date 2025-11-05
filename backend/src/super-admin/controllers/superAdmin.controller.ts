// backend/src/super-admin/controllers/superAdmin.controller.ts
import supabase from '../../database/supabaseClient';
import { generateNumericOtp } from '../../utils/otpGenerator';
import { sendOtpEmail } from '../../utils/emailSender';
import { sendOtpTelegram } from '../../utils/telegramSender';
import logger from '../../utils/logger';
import redis from '../../database/redisClient';
import { generateJwt } from '../../utils/generateJwt';
import { RequestHandler } from 'express';
import { findAdminByEmail, verifyPassword, getAdminPublicByEmail } from '../services/superAdmin.service';

const OTP_TTL_SECONDS = 60 * 20;       // 20 minutes
const RESEND_COOLDOWN_SECONDS = 30;    // 30 seconds

export const loginHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, password } = (req.body || {}) as { email: string; password: string };
        const admin = await findAdminByEmail(email);
        if (!admin) {
            logger.warn(`Invalid login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const valid = await verifyPassword(password, admin.password as string);
        if (!valid) {
            logger.warn(`Password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const otp = generateNumericOtp();
        await sendOtpEmail(email, otp);
        if ((admin as any).telegram_id) {
            await sendOtpTelegram((admin as any).telegram_id, otp);
        }

        await redis.set(`otp:${email}`, otp, { EX: OTP_TTL_SECONDS });
        // set an initial cooldown so the user cannot instantly spam resend
        await redis.set(`otp:cooldown:${email}`, '1', { EX: RESEND_COOLDOWN_SECONDS });

        res.json({ success: true, message: 'OTP sent to your email and Telegram.' });
    } catch (err: any) {
        logger.error(`POST /super-admin/login - ${err.message}`);
        next(err);
    }
};

export const verifyOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, otp } = (req.body || {}) as { email: string; otp: string };

        const storedOtp = await redis.get(`otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`otp:${email}`);

        const admin = await getAdminPublicByEmail(email);
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Admin not found.' });
        }

        const token = generateJwt({
            id: (admin as any).id,
            email: (admin as any).email,
            role: 'SUPER_ADMIN'
        });

        res.json({ success: true, message: 'OTP verified successfully.', token });
    } catch (err: any) {
        logger.error(`POST /super-admin/verify-otp - ${err.message}`);
        next(err);
    }
};

/**
 * POST /super-admin/resend-otp
 * Body: { email }
 * - Enforces a 30s cooldown using Redis
 * - Generates a fresh OTP, stores with 20m TTL
 * - Sends via email + Telegram (if telegram_id available)
 */
export const resendOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {}) as { email: string };

        // Cooldown check (best-effort: don't fail request if Redis is down)
        const cooldownKey = `otp:cooldown:${email}`;
        try {
            const cooling = await redis.get(cooldownKey);
            if (cooling) {
                let ttl = 0;
                try { ttl = await redis.ttl(cooldownKey); } catch (_) { /* ignore */ }
                logger.warn(`Resend-OTP cooldown hit for ${email} (ttl=${ttl}s)`);
                return res.status(429).json({
                    success: false,
                    message: ttl && ttl > 0
                        ? `Please wait ${ttl}s before requesting a new OTP.`
                        : 'Please wait before requesting a new OTP.',
                });
            }
        } catch (e: any) {
            logger.warn(`Redis unavailable during cooldown check for ${email}: ${e.message}`);
            // proceed without cooldown if Redis momentarily unavailable
        }

        // Ensure admin exists
        const { data: admins, error: dbError } = await supabase
            .from('super_admins')
            .select('id, email, name, telegram_id')
            .eq('email', email)
            .limit(1);

        if (dbError || !admins?.length) {
            logger.warn(`Resend requested for non-existent admin: ${email}`);
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }

        // Generate & send OTP
        const otp = generateNumericOtp();

        let emailOk = false;
        let telegramOk = false;

        try {
            await sendOtpEmail(email, otp);
            emailOk = true;
        } catch (e: any) {
            logger.error(`sendOtpEmail failed for ${email}: ${e.message}`);
        }

        try {
            const tid = admins[0].telegram_id;
            if (tid) {
                await sendOtpTelegram(tid, otp);
                telegramOk = true;
            }
        } catch (e: any) {
            logger.error(`sendOtpTelegram failed for ${email}: ${e.message}`);
        }

        // Store OTP & start cooldown (best-effort)
        try {
            await redis.set(`otp:${email}`, otp, { EX: OTP_TTL_SECONDS });
            await redis.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });
        } catch (e: any) {
            logger.warn(`Redis set failed for ${email} (otp/cooldown): ${e.message}`);
        }

        if (!emailOk && !telegramOk) {
            logger.error(`All channels failed to send OTP for ${email}`);
            return res
                .status(500)
                .json({ success: false, message: 'Could not send OTP. Please try again later.' });
        }

        const channels = [emailOk ? 'email' : null, telegramOk ? 'Telegram' : null]
            .filter(Boolean)
            .join(' & ');

        logger.info(`OTP resent for ${email} via ${channels}`);
        return res.json({ success: true, message: `OTP resent via ${channels}.` });
    } catch (err: any) {
        logger.error(`POST /super-admin/resend-otp - ${err.message}`);
        next(err); // your JSON error handler will format the response
    }
};

export const dashboardHandler: RequestHandler = (_req, res) => {
    res.json({ success: true, message: 'Welcome to the super admin dashboard!' });
};
