"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardHandler = exports.resendOtpHandler = exports.verifyOtpHandler = exports.loginHandler = void 0;
// backend/src/super-admin/controllers/superAdmin.controller.ts
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailSender_1 = require("../../utils/emailSender");
const telegramSender_1 = require("../../utils/telegramSender");
const logger_1 = __importDefault(require("../../utils/logger"));
const redisClient_1 = __importDefault(require("../../database/redisClient"));
const generateJwt_1 = require("../../utils/generateJwt");
const superAdmin_service_1 = require("../services/superAdmin.service");
const OTP_TTL_SECONDS = 60 * 20; // 20 minutes
const RESEND_COOLDOWN_SECONDS = 30; // 30 seconds
const loginHandler = async (req, res, next) => {
    try {
        const { email, password } = (req.body || {});
        const admin = await (0, superAdmin_service_1.findAdminByEmail)(email);
        if (!admin) {
            logger_1.default.warn(`Invalid login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const valid = await (0, superAdmin_service_1.verifyPassword)(password, admin.password);
        if (!valid) {
            logger_1.default.warn(`Password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        await (0, emailSender_1.sendOtpEmail)(email, otp);
        if (admin.telegram_id) {
            await (0, telegramSender_1.sendOtpTelegram)(admin.telegram_id, otp);
        }
        await redisClient_1.default.set(`otp:${email}`, otp, { EX: OTP_TTL_SECONDS });
        // set an initial cooldown so the user cannot instantly spam resend
        await redisClient_1.default.set(`otp:cooldown:${email}`, '1', { EX: RESEND_COOLDOWN_SECONDS });
        res.json({ success: true, message: 'OTP sent to your email and Telegram.' });
    }
    catch (err) {
        logger_1.default.error(`POST /super-admin/login - ${err.message}`);
        next(err);
    }
};
exports.loginHandler = loginHandler;
const verifyOtpHandler = async (req, res, next) => {
    try {
        const { email, otp } = (req.body || {});
        const storedOtp = await redisClient_1.default.get(`otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }
        await redisClient_1.default.del(`otp:${email}`);
        const admin = await (0, superAdmin_service_1.getAdminPublicByEmail)(email);
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Admin not found.' });
        }
        const token = (0, generateJwt_1.generateJwt)({
            id: admin.id,
            email: admin.email,
            role: 'SUPER_ADMIN'
        });
        res.json({ success: true, message: 'OTP verified successfully.', token });
    }
    catch (err) {
        logger_1.default.error(`POST /super-admin/verify-otp - ${err.message}`);
        next(err);
    }
};
exports.verifyOtpHandler = verifyOtpHandler;
/**
 * POST /super-admin/resend-otp
 * Body: { email }
 * - Enforces a 30s cooldown using Redis
 * - Generates a fresh OTP, stores with 20m TTL
 * - Sends via email + Telegram (if telegram_id available)
 */
const resendOtpHandler = async (req, res, next) => {
    try {
        const { email } = (req.body || {});
        // Cooldown check (best-effort: don't fail request if Redis is down)
        const cooldownKey = `otp:cooldown:${email}`;
        try {
            const cooling = await redisClient_1.default.get(cooldownKey);
            if (cooling) {
                let ttl = 0;
                try {
                    ttl = await redisClient_1.default.ttl(cooldownKey);
                }
                catch (_) { /* ignore */ }
                logger_1.default.warn(`Resend-OTP cooldown hit for ${email} (ttl=${ttl}s)`);
                return res.status(429).json({
                    success: false,
                    message: ttl && ttl > 0
                        ? `Please wait ${ttl}s before requesting a new OTP.`
                        : 'Please wait before requesting a new OTP.',
                });
            }
        }
        catch (e) {
            logger_1.default.warn(`Redis unavailable during cooldown check for ${email}: ${e.message}`);
            // proceed without cooldown if Redis momentarily unavailable
        }
        // Ensure admin exists
        const { data: admins, error: dbError } = await supabaseClient_1.default
            .from('super_admins')
            .select('id, email, name, telegram_id')
            .eq('email', email)
            .limit(1);
        if (dbError || !admins?.length) {
            logger_1.default.warn(`Resend requested for non-existent admin: ${email}`);
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }
        // Generate & send OTP
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        let emailOk = false;
        let telegramOk = false;
        try {
            await (0, emailSender_1.sendOtpEmail)(email, otp);
            emailOk = true;
        }
        catch (e) {
            logger_1.default.error(`sendOtpEmail failed for ${email}: ${e.message}`);
        }
        try {
            const tid = admins[0].telegram_id;
            if (tid) {
                await (0, telegramSender_1.sendOtpTelegram)(tid, otp);
                telegramOk = true;
            }
        }
        catch (e) {
            logger_1.default.error(`sendOtpTelegram failed for ${email}: ${e.message}`);
        }
        // Store OTP & start cooldown (best-effort)
        try {
            await redisClient_1.default.set(`otp:${email}`, otp, { EX: OTP_TTL_SECONDS });
            await redisClient_1.default.set(cooldownKey, '1', { EX: RESEND_COOLDOWN_SECONDS });
        }
        catch (e) {
            logger_1.default.warn(`Redis set failed for ${email} (otp/cooldown): ${e.message}`);
        }
        if (!emailOk && !telegramOk) {
            logger_1.default.error(`All channels failed to send OTP for ${email}`);
            return res
                .status(500)
                .json({ success: false, message: 'Could not send OTP. Please try again later.' });
        }
        const channels = [emailOk ? 'email' : null, telegramOk ? 'Telegram' : null]
            .filter(Boolean)
            .join(' & ');
        logger_1.default.info(`OTP resent for ${email} via ${channels}`);
        return res.json({ success: true, message: `OTP resent via ${channels}.` });
    }
    catch (err) {
        logger_1.default.error(`POST /super-admin/resend-otp - ${err.message}`);
        next(err); // your JSON error handler will format the response
    }
};
exports.resendOtpHandler = resendOtpHandler;
const dashboardHandler = (_req, res) => {
    res.json({ success: true, message: 'Welcome to the super admin dashboard!' });
};
exports.dashboardHandler = dashboardHandler;
