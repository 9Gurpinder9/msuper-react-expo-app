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

        const { data: company, error: dbError } = await supabase
            .from('companies')
            .select('id, name, email, password, is_active, email_verified')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

        if (dbError || !company) {
            logger.warn(`Invalid company login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!company.is_active) {
            logger.warn(`Inactive company login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
        }

        if (!company.email_verified) {
            logger.warn(`Unverified company login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'Your email address is not verified.' });
        }

        if (!company.password) {
            logger.warn(`Password not set for company: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, company.password);
        if (!valid) {
            logger.warn(`Company password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        let otp: string;
        if (process.env.NODE_ENV !== 'production') {
            otp = '123456';
            logger.info(`DEV ONLY: Company OTP for ${email} is ${otp}`);
        } else {
            otp = generateNumericOtp();
            try {
                await sendOtpEmail(company.email, otp);
            } catch (e: any) {
                logger.error(`sendOtpEmail failed for company ${email}: ${e?.message || e}`);
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }

        await redis.set(`company:otp:${company.email}`, otp, { EX: OTP_TTL_SECONDS });
        await redis.set(`company:otp:cooldown:${company.email}`, '1', { EX: RESEND_COOLDOWN_SECONDS });

        res.json({ success: true, message: 'OTP sent to your registered email.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/login - ${err.message}`);
        next(err);
    }
};

export const companyVerifyOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, otp, rememberMe } = (req.body || {}) as { email: string; otp: string; rememberMe?: boolean };

        const storedOtp = await redis.get(`company:otp:${email.trim().toLowerCase()}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`company:otp:${email.trim().toLowerCase()}`);

        const { data: company, error: dbError } = await supabase
            .from('companies')
            .select('id, name, email, is_active')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

        if (dbError || !company) {
            return res.status(401).json({ success: false, message: 'Company not found.' });
        }

        // Generate JWT: custom expiry if rememberMe is true, else default 24h
        const expiresIn = rememberMe ? '365d' : '24h';
        const token = generateJwt(
            {
                id: company.id,
                email: company.email,
                name: company.name,
                role: 'COMPANY',
            },
            { expiresIn }
        );

        res.json({
            success: true,
            message: 'OTP verified successfully.',
            token,
            company: {
                id: company.id,
                email: company.email,
                name: company.name,
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
        const cooldownKey = `company:otp:cooldown:${lowerEmail}`;

        const cooling = await redis.get(cooldownKey);
        if (cooling) {
            const ttl = await redis.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }

        const { data: company, error: dbError } = await supabase
            .from('companies')
            .select('id, email, name, is_active')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (dbError || !company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }

        const otp = generateNumericOtp();
        let emailOk = false;
        try {
            await sendOtpEmail(company.email, otp);
            emailOk = true;
        } catch (e: any) {
            logger.error(`Resend sendOtpEmail failed for company ${lowerEmail}: ${e.message}`);
        }

        if (!emailOk) {
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`DEV ONLY: Resent Company OTP for ${lowerEmail} is ${otp}`);
            } else {
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }

        await redis.set(`company:otp:${lowerEmail}`, otp, { EX: OTP_TTL_SECONDS });
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

        const { data: company, error: dbError } = await supabase
            .from('companies')
            .select('id, email, name, is_active')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (dbError || !company) {
            return res.status(404).json({ success: false, message: 'Email address not found.' });
        }

        if (!company.is_active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
        }

        const cooldownKey = `company:reset:cooldown:${lowerEmail}`;
        const cooling = await redis.get(cooldownKey);
        if (cooling) {
            const ttl = await redis.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }

        const otp = generateNumericOtp();
        try {
            await sendPasswordResetOtpEmail(company.email, otp);
        } catch (e: any) {
            logger.error(`sendPasswordResetOtpEmail failed for company ${lowerEmail}: ${e.message}`);
            return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
        }

        await redis.set(`company:reset:otp:${lowerEmail}`, otp, { EX: RESET_OTP_TTL_SECONDS });
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

        const storedOtp = await redis.get(`company:reset:otp:${lowerEmail}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`company:reset:otp:${lowerEmail}`);

        const resetToken = crypto.randomBytes(24).toString('hex');
        await redis.set(`company:reset:token:${lowerEmail}`, resetToken, { EX: RESET_TOKEN_TTL_SECONDS });

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

        const storedToken = await redis.get(`company:reset:token:${lowerEmail}`);
        if (!storedToken) {
            return res.status(400).json({ success: false, message: 'Reset token expired or not found.' });
        }
        if (storedToken !== resetToken) {
            return res.status(401).json({ success: false, message: 'Invalid reset token.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('companies')
            .update({
                password: passwordHash,
                updated_at: new Date().toISOString(),
            })
            .eq('email', lowerEmail);

        if (updateError) {
            logger.error(`Failed to update company password for ${lowerEmail}: ${updateError.message}`);
            return res.status(500).json({ success: false, message: 'Failed to update password.' });
        }

        await redis.del(`company:reset:token:${lowerEmail}`);
        return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
        logger.error(`POST /company/auth/reset-password/confirm - ${err.message}`);
        next(err);
    }
};
