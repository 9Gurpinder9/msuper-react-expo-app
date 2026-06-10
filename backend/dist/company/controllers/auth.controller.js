"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyResetPasswordConfirmHandler = exports.companyResetPasswordVerifyOtpHandler = exports.companyResetPasswordRequestHandler = exports.companyResendOtpHandler = exports.companyVerifyOtpHandler = exports.companyLoginHandler = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const redisClient_1 = __importDefault(require("../../database/redisClient"));
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailSender_1 = require("../../utils/emailSender");
const logger_1 = __importDefault(require("../../utils/logger"));
const generateJwt_1 = require("../../utils/generateJwt");
const hcaptcha_1 = require("../../utils/hcaptcha");
const config_1 = require("../../config");
const OTP_TTL_SECONDS = 60 * 3; // 3 minutes
const RESEND_COOLDOWN_SECONDS = 30; // 30 seconds
const RESET_OTP_TTL_SECONDS = 60 * 3; // 3 minutes
const RESET_TOKEN_TTL_SECONDS = 60 * 3; // 3 minutes
const companyLoginHandler = async (req, res, next) => {
    try {
        const { email, password, captchaToken } = (req.body || {});
        if (config_1.config.hcaptchaEnabled) {
            if (!captchaToken) {
                return res.status(401).json({ success: false, message: 'Captcha token is required.' });
            }
            const captcha = await (0, hcaptcha_1.verifyHcaptcha)(captchaToken, req.ip);
            if (!captcha.success) {
                return res.status(401).json({ success: false, message: 'Captcha verification failed.' });
            }
        }
        const { data: company, error: dbError } = await supabaseClient_1.default
            .from('companies')
            .select('id, name, email, password, is_active, email_verified')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();
        if (dbError || !company) {
            logger_1.default.warn(`Invalid company login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        if (!company.is_active) {
            logger_1.default.warn(`Inactive company login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
        }
        if (!company.email_verified) {
            logger_1.default.warn(`Unverified company login attempt for email: ${email}`);
            return res.status(403).json({ success: false, message: 'Your email address is not verified.' });
        }
        if (!company.password) {
            logger_1.default.warn(`Password not set for company: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const valid = await bcrypt_1.default.compare(password, company.password);
        if (!valid) {
            logger_1.default.warn(`Company password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        let otp;
        if (process.env.NODE_ENV !== 'production') {
            otp = '123456';
            logger_1.default.info(`DEV ONLY: Company OTP for ${email} is ${otp}`);
        }
        else {
            otp = (0, otpGenerator_1.generateNumericOtp)();
            try {
                await (0, emailSender_1.sendOtpEmail)(company.email, otp);
            }
            catch (e) {
                logger_1.default.error(`sendOtpEmail failed for company ${email}: ${e?.message || e}`);
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }
        await redisClient_1.default.set(`company:otp:${company.email}`, otp, { EX: OTP_TTL_SECONDS });
        await redisClient_1.default.set(`company:otp:cooldown:${company.email}`, '1', { EX: RESEND_COOLDOWN_SECONDS });
        res.json({ success: true, message: 'OTP sent to your registered email.' });
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/login - ${err.message}`);
        next(err);
    }
};
exports.companyLoginHandler = companyLoginHandler;
const companyVerifyOtpHandler = async (req, res, next) => {
    try {
        const { email, otp, rememberMe } = (req.body || {});
        const storedOtp = await redisClient_1.default.get(`company:otp:${email.trim().toLowerCase()}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }
        await redisClient_1.default.del(`company:otp:${email.trim().toLowerCase()}`);
        const { data: company, error: dbError } = await supabaseClient_1.default
            .from('companies')
            .select('id, name, email, is_active')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();
        if (dbError || !company) {
            return res.status(401).json({ success: false, message: 'Company not found.' });
        }
        // Generate JWT: custom expiry if rememberMe is true, else default 24h
        const expiresIn = rememberMe ? '365d' : '24h';
        const token = (0, generateJwt_1.generateJwt)({
            id: company.id,
            email: company.email,
            name: company.name,
            role: 'COMPANY',
        }, { expiresIn });
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
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/verify-otp - ${err.message}`);
        next(err);
    }
};
exports.companyVerifyOtpHandler = companyVerifyOtpHandler;
const companyResendOtpHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {});
        const lowerEmail = email.trim().toLowerCase();
        const cooldownKey = `company:otp:cooldown:${lowerEmail}`;
        const cooling = await redisClient_1.default.get(cooldownKey);
        if (cooling) {
            const ttl = await redisClient_1.default.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }
        const { data: company, error: dbError } = await supabaseClient_1.default
            .from('companies')
            .select('id, email, name, is_active')
            .eq('email', lowerEmail)
            .maybeSingle();
        if (dbError || !company) {
            return res.status(404).json({ success: false, message: 'Company not found.' });
        }
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        let emailOk = false;
        try {
            await (0, emailSender_1.sendOtpEmail)(company.email, otp);
            emailOk = true;
        }
        catch (e) {
            logger_1.default.error(`Resend sendOtpEmail failed for company ${lowerEmail}: ${e.message}`);
        }
        if (!emailOk) {
            if (process.env.NODE_ENV !== 'production') {
                logger_1.default.info(`DEV ONLY: Resent Company OTP for ${lowerEmail} is ${otp}`);
            }
            else {
                return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
            }
        }
        await redisClient_1.default.set(`company:otp:${lowerEmail}`, otp, { EX: OTP_TTL_SECONDS });
        await redisClient_1.default.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });
        return res.json({ success: true, message: 'OTP resent successfully.' });
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/resend-otp - ${err.message}`);
        next(err);
    }
};
exports.companyResendOtpHandler = companyResendOtpHandler;
const companyResetPasswordRequestHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {});
        const lowerEmail = email.trim().toLowerCase();
        const { data: company, error: dbError } = await supabaseClient_1.default
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
        const cooling = await redisClient_1.default.get(cooldownKey);
        if (cooling) {
            const ttl = await redisClient_1.default.ttl(cooldownKey);
            return res.status(429).json({
                success: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl}s before requesting a new OTP.` : 'Please wait before requesting a new OTP.',
            });
        }
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        try {
            await (0, emailSender_1.sendPasswordResetOtpEmail)(company.email, otp);
        }
        catch (e) {
            logger_1.default.error(`sendPasswordResetOtpEmail failed for company ${lowerEmail}: ${e.message}`);
            return res.status(500).json({ success: false, message: 'Could not send OTP. Please try again later.' });
        }
        await redisClient_1.default.set(`company:reset:otp:${lowerEmail}`, otp, { EX: RESET_OTP_TTL_SECONDS });
        await redisClient_1.default.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });
        return res.json({ success: true, message: 'OTP sent to your email.' });
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/reset-password/request - ${err.message}`);
        next(err);
    }
};
exports.companyResetPasswordRequestHandler = companyResetPasswordRequestHandler;
const companyResetPasswordVerifyOtpHandler = async (req, res, next) => {
    try {
        const { email, otp } = (req.body || {});
        const lowerEmail = email.trim().toLowerCase();
        const storedOtp = await redisClient_1.default.get(`company:reset:otp:${lowerEmail}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }
        await redisClient_1.default.del(`company:reset:otp:${lowerEmail}`);
        const resetToken = crypto_1.default.randomBytes(24).toString('hex');
        await redisClient_1.default.set(`company:reset:token:${lowerEmail}`, resetToken, { EX: RESET_TOKEN_TTL_SECONDS });
        return res.json({ success: true, message: 'OTP verified.', resetToken });
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/reset-password/verify-otp - ${err.message}`);
        next(err);
    }
};
exports.companyResetPasswordVerifyOtpHandler = companyResetPasswordVerifyOtpHandler;
const companyResetPasswordConfirmHandler = async (req, res, next) => {
    try {
        const { email, resetToken, newPassword } = (req.body || {});
        const lowerEmail = email.trim().toLowerCase();
        const storedToken = await redisClient_1.default.get(`company:reset:token:${lowerEmail}`);
        if (!storedToken) {
            return res.status(400).json({ success: false, message: 'Reset token expired or not found.' });
        }
        if (storedToken !== resetToken) {
            return res.status(401).json({ success: false, message: 'Invalid reset token.' });
        }
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        const { error: updateError } = await supabaseClient_1.default
            .from('companies')
            .update({
            password: passwordHash,
            updated_at: new Date().toISOString(),
        })
            .eq('email', lowerEmail);
        if (updateError) {
            logger_1.default.error(`Failed to update company password for ${lowerEmail}: ${updateError.message}`);
            return res.status(500).json({ success: false, message: 'Failed to update password.' });
        }
        await redisClient_1.default.del(`company:reset:token:${lowerEmail}`);
        return res.json({ success: true, message: 'Password updated successfully.' });
    }
    catch (err) {
        logger_1.default.error(`POST /company/auth/reset-password/confirm - ${err.message}`);
        next(err);
    }
};
exports.companyResetPasswordConfirmHandler = companyResetPasswordConfirmHandler;
