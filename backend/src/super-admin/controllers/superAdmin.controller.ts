import supabase from '../../database/supabaseClient';
import { generateNumericOtp } from '../../utils/otpGenerator';
import { sendOtpEmail } from '../../utils/emailSender';
import { sendOtpTelegram } from '../../utils/telegramSender';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import Joi from 'joi';
import redis from '../../database/redisClient';
import { generateJwt } from '../../utils/generateJwt';
import { RequestHandler } from 'express';

const loginSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
        'any.required': 'Email is required.'
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.'
    })
});

export const loginHandler: RequestHandler = async (req, res, next) => {
    try {
        const input = req.body || {};
        const { error, value } = loginSchema.validate(input, { abortEarly: false });
        if (error) {
            logger.warn(`Validation failed on login: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(d => d.message)
            });
        }

        const { email, password } = value;
        const { data: admins, error: dbError } = await supabase
            .from('super_admins')
            .select('*')
            .eq('email', email)
            .limit(1);

        if (dbError || !admins?.length) {
            logger.warn(`Invalid login attempt for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, admins[0].password as string);
        if (!valid) {
            logger.warn(`Password mismatch for email: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const otp = generateNumericOtp();
        await sendOtpEmail(email, otp);
        if (admins[0].telegram_id) {
            await sendOtpTelegram(admins[0].telegram_id, otp);
        }
        await redis.set(`otp:${email}`, otp, { EX: 1200 });

        // logger.info(`OTP sent to super admin: ${email}`);
        res.json({ success: true, message: 'OTP sent to your email and Telegram.' });
    } catch (err: any) {
        logger.error(`POST /super-admin/login - ${err.message}`);
        next(err);
    }
};

export const verifyOtpHandler: RequestHandler = async (req, res, next) => {
    try {
        const { email, otp } = req.body || {};
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const storedOtp = await redis.get(`otp:${email}`);
        if (!storedOtp) {
            return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        await redis.del(`otp:${email}`);
        const { data: admins, error } = await supabase
            .from('super_admins')
            .select('id, email, name')
            .eq('email', email)
            .limit(1);

        if (error || !admins?.length) {
            return res.status(401).json({ success: false, message: 'Admin not found.' });
        }

        const token = generateJwt({
            id: admins[0].id,
            email: admins[0].email,
            role: 'SUPER_ADMIN'
        });

        res.json({ success: true, message: 'OTP verified successfully.', token });
    } catch (err: any) {
        logger.error(`POST /super-admin/verify-otp - ${err.message}`);
        next(err);
    }
};

export const dashboardHandler: RequestHandler = (_req, res) => {
    res.json({ success: true, message: 'Welcome to the super admin dashboard!' });
};
