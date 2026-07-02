import { RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import supabase from '../../database/supabaseClient';
import redis from '../../database/redisClient';
import { generateNumericOtp } from '../../utils/otpGenerator';
import { sendOtpEmail, sendPasswordResetOtpEmail } from '../../utils/emailSender';
import logger from '../../utils/logger';
import { generateJwt } from '../../utils/generateJwt';
import { verifyHcaptcha } from '../../utils/hcaptcha';
import { config } from '../../config';

const OTP_TTL_SECONDS = 60 * 3;        // 3 minutes
const RESEND_COOLDOWN_SECONDS = 30;    // 30 seconds
const RESET_OTP_TTL_SECONDS = 60 * 3;  // 3 minutes
const RESET_TOKEN_TTL_SECONDS = 60 * 3; // 3 minutes

export const companyLoginHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, password, captchaToken } = (req.body || {}) as { email: string; password: string; captchaToken?: string };

        if (config.hcaptchaEnabled) {
            if (!captchaToken) {
                return res.status(401).json({ success: false, message: 'Captcha token is required.' });
            }
            const captcha = await verifyHcaptcha(captchaToken, req.ip);
            if (!captcha.success) {
                return res.status(401).json({ success: false, message: 'Captcha verification failed.' });
            }
        }

        // 1. Query user from users table
        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('id, company_id, name, email, password, is_active, email_verified')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

        if (dbError || !user) {
            logger.warn(`Invalid company user login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 2. Query company status
        const { data: company, error: compError } = await supabase
            .from('companies')
            .select('id, is_active')
            .eq('id', user.company_id)
            .maybeSingle();

        if (compError || !company) {
            logger.error(`Company reference not found for user: ${user.email}`, compError);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!company.is_active) {
            logger.warn(`Workspace is deactivated for user: ${email}`);
            return res.status(403).json({ success: false, message: 'Workspace is deactivated. Please contact support.' });
        }

        if (!user.is_active) {
            logger.warn(`Inactive user login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'User account is deactivated. Please contact support.' });
        }

        if (!user.email_verified) {
            logger.warn(`Unverified user login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'Your email address is not verified.' });
        }

        if (!user.password) {
            logger.warn(`Password not set for user: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            logger.warn(`Company user password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        let otp: string;
        if (process.env.NODE_ENV !== 'production') {
            otp = '123456';
            logger.info(`DEV ONLY: User OTP for ${email} is ${otp}`);
        } else {
            otp = generateNumericOtp();
            try {
                await sendOtpEmail(user.email, otp);
            } catch (e: any) {
                logger.error(`sendOtpEmail failed for user ${email}: ${e?.message || e}`);
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }

        await redis.set(`user:otp:${user.email}`, otp, { EX: OTP_TTL_SECONDS });
        await redis.set(`user:otp:cooldown:${user.email}`, '1', { EX: RESEND_COOLDOWN_SECONDS });

        res.json({ success: true, message: 'OTP sent to your registered email.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/login - ${err.message}`);
        next(err);
    }
};

export const companyVerifyOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, otp, rememberMe } = (req.body || {}) as { email: string; otp: string; rememberMe?: boolean };
        const lowerEmail = email.trim().toLowerCase();

        const storedOtp = await redis.get(`user:otp:${lowerEmail}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`user:otp:${lowerEmail}`);

        // Fetch user joining roles table
        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('id, company_id, name, email, is_active, roles(id, name)')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (dbError || !user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        const userRole = (user as any).roles?.name || 'USER';

        // Generate JWT: custom expiry if rememberMe is true, else default 24h
        const expiresIn = rememberMe ? '365d' : '24h';
        const token = generateJwt(
            {
                id: user.company_id, // companyId remains the main ID for workspace queries
                userId: user.id,
                email: user.email,
                name: user.name,
                role: userRole,
            },
            { expiresIn }
        );

        res.json({
            success: true,
            message: 'OTP verified successfully.',
            token,
            company: {
                id: user.company_id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (err: any) {
        logger.error(`POST /company/auth/verify-otp - ${err.message}`);
        next(err);
    }
};

export const companyResendOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {}) as { email: string };
        const lowerEmail = email.trim().toLowerCase();
        const cooldownKey = `user:otp:cooldown:${lowerEmail}`;

        const cooling = await redis.get(cooldownKey);
        if (cooling) {
            const ttl = await redis.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }

        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('id, email, name, is_active')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (dbError || !user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const otp = generateNumericOtp();
        let emailOk = false;
        try {
            await sendOtpEmail(user.email, otp);
            emailOk = true;
        } catch (e: any) {
            logger.error(`Resend sendOtpEmail failed for user ${lowerEmail}: ${e.message}`);
        }

        if (!emailOk) {
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`DEV ONLY: Resent User OTP for ${lowerEmail} is ${otp}`);
            } else {
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }

        await redis.set(`user:otp:${lowerEmail}`, otp, { EX: OTP_TTL_SECONDS });
        await redis.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });

        return res.json({ success: true, message: 'OTP resent successfully.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/resend-otp - ${err.message}`);
        next(err);
    }
};

export const companyResetPasswordRequestHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {}) as { email: string };
        const lowerEmail = email.trim().toLowerCase();

        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('id, email, name, is_active, company_id, companies(name)')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (dbError || !user) {
            return res.status(404).json({ success: false, message: 'Email address not found.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
        }

        const cooldownKey = `user:reset:cooldown:${lowerEmail}`;
        const cooling = await redis.get(cooldownKey);
        if (cooling) {
            const ttl = await redis.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }

        const otp = generateNumericOtp();
        const companyName = (user as any)?.companies?.name || 'Your Company';
        try {
            await sendPasswordResetOtpEmail(user.email, otp, user.name, companyName);
        } catch (e: any) {
            logger.error(`sendPasswordResetOtpEmail failed for user ${lowerEmail}: ${e.message}`);
            return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
        }

        await redis.set(`user:reset:otp:${lowerEmail}`, otp, { EX: RESET_OTP_TTL_SECONDS });
        await redis.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });

        return res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/reset-password/request - ${err.message}`);
        next(err);
    }
};

export const companyResetPasswordVerifyOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, otp } = (req.body || {}) as { email: string; otp: string };
        const lowerEmail = email.trim().toLowerCase();

        const storedOtp = await redis.get(`user:reset:otp:${lowerEmail}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`user:reset:otp:${lowerEmail}`);

        const resetToken = crypto.randomBytes(24).toString('hex');
        await redis.set(`user:reset:token:${lowerEmail}`, resetToken, { EX: RESET_TOKEN_TTL_SECONDS });

        return res.json({ success: true, message: 'OTP verified.', resetToken });
    } catch (err: any) {
        logger.error(`POST /company/auth/reset-password/verify-otp - ${err.message}`);
        next(err);
    }
};

export const companyResetPasswordConfirmHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, resetToken, newPassword } = (req.body || {}) as {
            email: string;
            resetToken: string;
            newPassword: string;
        };
        const lowerEmail = email.trim().toLowerCase();

        const storedToken = await redis.get(`user:reset:token:${lowerEmail}`);
        if (!storedToken) {
            return res.status(400).json({ success: false, message: 'Reset token expired or not found.' });
        }
        if (storedToken !== resetToken) {
            return res.status(401).json({ success: false, message: 'Invalid reset token.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: passwordHash,
                updated_at: new Date().toISOString(),
            })
            .eq('email', lowerEmail);

        if (updateError) {
            logger.error(`Failed to update user password for ${lowerEmail}: ${updateError.message}`);
            return res.status(500).json({ success: false, message: 'Failed to update password.' });
        }

        await redis.del(`user:reset:token:${lowerEmail}`);
        return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/reset-password/confirm - ${err.message}`);
        next(err);
    }
};
