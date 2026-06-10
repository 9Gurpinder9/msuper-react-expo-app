"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionPlans = getSubscriptionPlans;
exports.createSubscriptionPlan = createSubscriptionPlan;
exports.updateSubscriptionPlan = updateSubscriptionPlan;
exports.toggleSubscriptionPlanStatus = toggleSubscriptionPlanStatus;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function getSubscriptionPlans(req, res, next) {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;
        let query = supabaseClient_1.default
            .from('subscription_plans')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true });
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }
        // Apply pagination range
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            logger_1.default.error('Failed to fetch subscription plans', { error });
            return res.status(500).json({ ok: false, message: 'Failed to fetch subscription plans' });
        }
        const total = count ?? 0;
        const hasMore = offset + limit < total;
        return res.status(200).json({
            ok: true,
            data,
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
async function createSubscriptionPlan(req, res, next) {
    try {
        const { name, description, price, amc_price, duration_days, is_active } = req.body;
        // 1. Check for duplicates (case insensitive)
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('subscription_plans')
            .select('id, name')
            .ilike('name', name.trim());
        if (checkError) {
            logger_1.default.error('Error checking duplicate subscription plan', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        if (existing && existing.length > 0) {
            return res.status(409).json({
                ok: false,
                message: 'A subscription plan with this name already exists.',
            });
        }
        // 2. Insert subscription plan
        const { data, error } = await supabaseClient_1.default
            .from('subscription_plans')
            .insert({
            name: name.trim(),
            description: description ? description.trim() : null,
            price: Number(price),
            amc_price: Number(amc_price),
            duration_days: Number(duration_days),
            is_active: is_active ?? true,
        })
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to create subscription plan', { error });
            return res.status(500).json({ ok: false, message: 'Failed to create subscription plan' });
        }
        return res.status(201).json({ ok: true, data, message: 'Subscription plan created successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function updateSubscriptionPlan(req, res, next) {
    try {
        const { id } = req.params;
        const { name, description, price, amc_price, duration_days, is_active } = req.body;
        // 1. Check for duplicates excluding current id
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('subscription_plans')
            .select('id, name')
            .ilike('name', name.trim());
        if (checkError) {
            logger_1.default.error('Error checking duplicate subscription plan update', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];
        if (duplicates.length > 0) {
            return res.status(409).json({
                ok: false,
                message: 'A subscription plan with this name already exists.',
            });
        }
        // 2. Update subscription plan
        const { data, error } = await supabaseClient_1.default
            .from('subscription_plans')
            .update({
            name: name.trim(),
            description: description ? description.trim() : null,
            price: Number(price),
            amc_price: Number(amc_price),
            duration_days: Number(duration_days),
            is_active: is_active ?? true,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to update subscription plan', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update subscription plan' });
        }
        return res.status(200).json({ ok: true, data, message: 'Subscription plan updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function toggleSubscriptionPlanStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const { data, error } = await supabaseClient_1.default
            .from('subscription_plans')
            .update({
            is_active,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to toggle subscription plan status', { error });
            return res.status(500).json({ ok: false, message: 'Failed to toggle status' });
        }
        return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
