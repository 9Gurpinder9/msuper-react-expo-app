"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanies = getCompanies;
exports.createCompany = createCompany;
exports.updateCompany = updateCompany;
exports.toggleCompanyStatus = toggleCompanyStatus;
exports.sendCompanyVerification = sendCompanyVerification;
exports.verifyCompanyEmail = verifyCompanyEmail;
const bcrypt_1 = __importDefault(require("bcrypt"));
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
const redisClient_1 = __importDefault(require("../../database/redisClient"));
const otpGenerator_1 = require("../../utils/otpGenerator");
const emailSender_1 = require("../../utils/emailSender");
async function getCompanies(req, res, next) {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;
        let query = supabaseClient_1.default
            .from('companies')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true });
        if (search) {
            query = query.or(`name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            logger_1.default.error('Failed to fetch companies', { error });
            return res.status(500).json({ ok: false, message: 'Failed to fetch companies' });
        }
        const sanitizedData = (data || []).map((company) => {
            const { password, ...rest } = company;
            return {
                ...rest,
                has_password: !!password,
            };
        });
        const total = count ?? 0;
        const hasMore = offset + limit < total;
        return res.status(200).json({
            ok: true,
            data: sanitizedData,
            pagination: {
                page,
                limit,
                total,
                has_more: hasMore,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function createCompany(req, res, next) {
    try {
        const body = req.body;
        // 1. Check for duplicates (email should be unique)
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('companies')
            .select('id, name, email')
            .or(`email.ilike.${body.email.trim()},name.ilike.${body.name.trim()}`);
        if (checkError) {
            logger_1.default.error('Error checking duplicate company details', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        if (existing && existing.length > 0) {
            const match = existing[0];
            const field = match.email.toLowerCase() === body.email.trim().toLowerCase() ? 'email' : 'name';
            return res.status(409).json({
                ok: false,
                message: `A company with this ${field} already exists.`,
            });
        }
        // 2. Insert company details
        const { data, error } = await supabaseClient_1.default
            .from('companies')
            .insert({
            owner_name: body.owner_name.trim(),
            name: body.name.trim(),
            email: body.email.trim().toLowerCase(),
            mobile1: body.mobile1.trim(),
            mobile2: body.mobile2 ? body.mobile2.trim() : null,
            country_id: body.country_id,
            country_name: body.country_name.trim(),
            state_id: body.state_id,
            state_name: body.state_name.trim(),
            city_id: body.city_id,
            city_name: body.city_name.trim(),
            category_id: body.category_id,
            category_name: body.category_name.trim(),
            plan_id: body.plan_id,
            gst_no: body.gst_no ? body.gst_no.trim().toUpperCase() : null,
            address1: body.address1 ? body.address1.trim().toUpperCase() : null,
            address2: body.address2 ? body.address2.trim().toUpperCase() : null,
            print_name: body.print_name ? body.print_name.trim().toUpperCase() : null,
            validity_date: body.validity_date,
            expiry_date: body.expiry_date,
            is_active: body.is_active ?? true,
        })
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to create company', { error });
            return res.status(500).json({ ok: false, message: 'Failed to create company' });
        }
        return res.status(201).json({ ok: true, data, message: 'Company created successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function updateCompany(req, res, next) {
    try {
        const { id } = req.params;
        const body = req.body;
        // Fetch current company record to detect email change
        const { data: currentCompany, error: currentError } = await supabaseClient_1.default
            .from('companies')
            .select('email, password')
            .eq('id', id)
            .single();
        if (currentError || !currentCompany) {
            logger_1.default.error('Failed to find company for update', { error: currentError });
            return res.status(404).json({ ok: false, message: 'Company not found' });
        }
        const emailChanged = currentCompany.email.toLowerCase() !== body.email.trim().toLowerCase();
        // 1. Check for duplicates excluding current company ID
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('companies')
            .select('id, name, email')
            .or(`email.ilike.${body.email.trim()},name.ilike.${body.name.trim()}`);
        if (checkError) {
            logger_1.default.error('Error checking duplicate company update details', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];
        if (duplicates.length > 0) {
            const match = duplicates[0];
            const field = match.email.toLowerCase() === body.email.trim().toLowerCase() ? 'email' : 'name';
            return res.status(409).json({
                ok: false,
                message: `A company with this ${field} already exists.`,
            });
        }
        // If email changed, invalidate verification OTP from Redis
        if (emailChanged) {
            await redisClient_1.default.del(`company:verify:${id}`);
        }
        // 2. Update company details
        const updatePayload = {
            owner_name: body.owner_name.trim(),
            name: body.name.trim(),
            email: body.email.trim().toLowerCase(),
            mobile1: body.mobile1.trim(),
            mobile2: body.mobile2 ? body.mobile2.trim() : null,
            country_id: body.country_id,
            country_name: body.country_name.trim(),
            state_id: body.state_id,
            state_name: body.state_name.trim(),
            city_id: body.city_id,
            city_name: body.city_name.trim(),
            category_id: body.category_id,
            category_name: body.category_name.trim(),
            plan_id: body.plan_id,
            gst_no: body.gst_no ? body.gst_no.trim().toUpperCase() : null,
            address1: body.address1 ? body.address1.trim().toUpperCase() : null,
            address2: body.address2 ? body.address2.trim().toUpperCase() : null,
            print_name: body.print_name ? body.print_name.trim().toUpperCase() : null,
            validity_date: body.validity_date,
            expiry_date: body.expiry_date,
            is_active: body.is_active ?? true,
            updated_at: new Date().toISOString(),
        };
        if (emailChanged) {
            updatePayload.email_verified = false;
            updatePayload.verification_sent_at = null;
        }
        if (body.password) {
            if (currentCompany.password) {
                return res.status(400).json({ ok: false, message: 'Password is already set and cannot be modified.' });
            }
            updatePayload.password = await bcrypt_1.default.hash(body.password, 10);
        }
        const { data, error } = await supabaseClient_1.default
            .from('companies')
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to update company details', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update company details' });
        }
        return res.status(200).json({ ok: true, data, message: 'Company updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function toggleCompanyStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const { data, error } = await supabaseClient_1.default
            .from('companies')
            .update({
            is_active,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to toggle company status', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update status' });
        }
        return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function sendCompanyVerification(req, res, next) {
    try {
        const { id } = req.params;
        // Fetch company details
        const { data: company, error: fetchErr } = await supabaseClient_1.default
            .from('companies')
            .select('id, name, owner_name, email, verification_sent_at')
            .eq('id', id)
            .single();
        if (fetchErr || !company) {
            return res.status(404).json({ ok: false, message: 'Company not found' });
        }
        const email = company.email;
        const cooldownKey = `company:verify:cooldown:${id}`;
        // Enforce 30s cooldown
        const cooling = await redisClient_1.default.get(cooldownKey);
        if (cooling) {
            const ttl = await redisClient_1.default.ttl(cooldownKey);
            return res.status(429).json({
                ok: false,
                message: ttl && ttl > 0 ? `Please wait ${ttl} seconds before requesting a new OTP.` : 'Please wait before requesting a new OTP.'
            });
        }
        const otp = (0, otpGenerator_1.generateNumericOtp)();
        // Send email containing OTP and company details
        try {
            await (0, emailSender_1.sendCompanyVerificationEmail)(email, otp, company.name, company.owner_name);
        }
        catch (mailErr) {
            logger_1.default.error(`Failed to send company verification email: ${mailErr.message}`);
            // In non-prod, log the OTP and continue for diagnostic purposes
            if (process.env.NODE_ENV !== 'production') {
                logger_1.default.info(`DEV ONLY: Company Verification OTP for ${email} is ${otp}`);
            }
            else {
                return res.status(500).json({ ok: false, message: 'Could not send verification email. Please try again later.' });
            }
        }
        // Set Redis OTP (15 min TTL) and cooldown (30s)
        await redisClient_1.default.set(`company:verify:${id}`, otp, { EX: 60 * 15 });
        await redisClient_1.default.set(cooldownKey, '1', { EX: 30 });
        // Update verification_sent_at timestamp in database
        await supabaseClient_1.default
            .from('companies')
            .update({ verification_sent_at: new Date().toISOString() })
            .eq('id', id);
        return res.status(200).json({ ok: true, message: 'Verification OTP sent successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function verifyCompanyEmail(req, res, next) {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const storedOtp = await redisClient_1.default.get(`company:verify:${id}`);
        if (!storedOtp) {
            return res.status(400).json({ ok: false, message: 'OTP expired or not found. Please resend verification email.' });
        }
        if (storedOtp !== otp) {
            return res.status(401).json({ ok: false, message: 'Invalid OTP.' });
        }
        // Correct OTP: delete OTP and update status in database
        await redisClient_1.default.del(`company:verify:${id}`);
        const { data, error } = await supabaseClient_1.default
            .from('companies')
            .update({
            email_verified: true,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to update company email verification status', { error });
            return res.status(500).json({ ok: false, message: 'Failed to verify email in database.' });
        }
        return res.status(200).json({ ok: true, data, message: 'Email verified successfully!' });
    }
    catch (error) {
        next(error);
    }
}
