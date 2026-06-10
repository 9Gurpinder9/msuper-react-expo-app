"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyCategories = getCompanyCategories;
exports.createCompanyCategory = createCompanyCategory;
exports.updateCompanyCategory = updateCompanyCategory;
exports.toggleCompanyCategoryStatus = toggleCompanyCategoryStatus;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function getCompanyCategories(req, res, next) {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;
        let query = supabaseClient_1.default
            .from('company_categories')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true });
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            logger_1.default.error('Failed to fetch company categories', { error });
            return res.status(500).json({ ok: false, message: 'Failed to fetch company categories' });
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
async function createCompanyCategory(req, res, next) {
    try {
        const { name, is_active } = req.body;
        // 1. Check for duplicates
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('company_categories')
            .select('id, name')
            .ilike('name', name.trim());
        if (checkError) {
            logger_1.default.error('Error checking duplicate company category', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        if (existing && existing.length > 0) {
            return res.status(409).json({
                ok: false,
                message: 'A category with this name already exists.',
            });
        }
        // 2. Insert category
        const { data, error } = await supabaseClient_1.default
            .from('company_categories')
            .insert({
            name: name.trim(),
            is_active: is_active ?? true,
        })
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to create company category', { error });
            return res.status(500).json({ ok: false, message: 'Failed to create company category' });
        }
        return res.status(201).json({ ok: true, data, message: 'Company category created successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function updateCompanyCategory(req, res, next) {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        // 1. Check for duplicate name excluding current record ID
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('company_categories')
            .select('id, name')
            .ilike('name', name.trim());
        if (checkError) {
            logger_1.default.error('Error checking duplicate company category update', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];
        if (duplicates.length > 0) {
            return res.status(409).json({
                ok: false,
                message: 'A category with this name already exists.',
            });
        }
        // 2. Update category
        const { data, error } = await supabaseClient_1.default
            .from('company_categories')
            .update({
            name: name.trim(),
            is_active: is_active ?? true,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to update company category', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update company category' });
        }
        return res.status(200).json({ ok: true, data, message: 'Company category updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function toggleCompanyCategoryStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const { data, error } = await supabaseClient_1.default
            .from('company_categories')
            .update({
            is_active,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to toggle company category status', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update status' });
        }
        return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
