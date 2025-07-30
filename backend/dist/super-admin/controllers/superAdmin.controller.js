"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardHandler = exports.verifyOtpHandler = exports.loginHandler = void 0;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailSender_1 = require("../../utils/emailSender");
const telegramSender_1 = require("../../utils/telegramSender");
const bcrypt_1 = __importDefault(require("bcrypt"));
const logger_1 = __importDefault(require("../../utils/logger"));
const joi_1 = __importDefault(require("joi"));
const redisClient_1 = __importDefault(require("../../database/redisClient"));
const generateJwt_1 = require("../../utils/generateJwt");
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
        'any.required': 'Email is required.'
    }),
    password: joi_1.default.string().min(6).required().messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    })
});
const loginHandler = async (req, res, next) => {
    try {
        const input = req.body || {};
        const { error, value } = loginSchema.validate(input, { abortEarly: false });
        if (error) {
            logger_1.default.warn(`Validation failed on login: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(d => d.message)
            });
        }
        const { email, password } = value;
        const { data: admins, error: dbError } = await supabaseClient_1.default
            .from('super_admins')
            .select('*')
            .eq('email', email)
            .limit(1);
        if (dbError || !admins?.length) {
            logger_1.default.warn(`Invalid login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const valid = await bcrypt_1.default.compare(password, admins[0].password);
        if (!valid) {
            logger_1.default.warn(`Password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        await (0, emailSender_1.sendOtpEmail)(email, otp);
        if (admins[0].telegram_id) {
            await (0, telegramSender_1.sendOtpTelegram)(admins[0].telegram_id, otp);
        }
        await redisClient_1.default.set(`otp:${email}`, otp, { EX: 1200 });
        // logger.info(`OTP sent to super admin: ${email}`);
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
        const { email, otp } = req.body || {};
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }
        const storedOtp = await redisClient_1.default.get(`otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }
        await redisClient_1.default.del(`otp:${email}`);
        const { data: admins, error } = await supabaseClient_1.default
            .from('super_admins')
            .select('id, email, name')
            .eq('email', email)
            .limit(1);
        if (error || !admins?.length) {
            return res.status(401).json({ success: false, message: 'Admin not found.' });
        }
        const token = (0, generateJwt_1.generateJwt)({
            id: admins[0].id,
            email: admins[0].email,
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
const dashboardHandler = (_req, res) => {
    res.json({ success: true, message: 'Welcome to the super admin dashboard!' });
};
exports.dashboardHandler = dashboardHandler;
