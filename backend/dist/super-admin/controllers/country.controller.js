"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountries = getCountries;
exports.createCountry = createCountry;
exports.updateCountry = updateCountry;
exports.toggleCountryStatus = toggleCountryStatus;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function getCountries(req, res, next) {
    try {
        const search = req.query.search;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = (page - 1) * limit;
        let query = supabaseClient_1.default
            .from('countries')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true });
        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }
        // Apply pagination range
        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) {
            logger_1.default.error('Failed to fetch countries', { error });
            return res.status(500).json({ ok: false, message: 'Failed to fetch countries' });
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
async function createCountry(req, res, next) {
    try {
        const { name, code, phone_code, is_active } = req.body;
        // 1. Check for duplicates (case insensitive)
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('countries')
            .select('id, name, code')
            .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);
        if (checkError) {
            logger_1.default.error('Error checking duplicate country', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        if (existing && existing.length > 0) {
            const match = existing[0];
            const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
            return res.status(409).json({
                ok: false,
                message: `A country with this ${field} already exists.`,
            });
        }
        // 2. Insert country
        const { data, error } = await supabaseClient_1.default
            .from('countries')
            .insert({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            phone_code: phone_code ? phone_code.trim() : null,
            is_active: is_active ?? true,
        })
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to create country', { error });
            return res.status(500).json({ ok: false, message: 'Failed to create country' });
        }
        return res.status(201).json({ ok: true, data, message: 'Country created successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function updateCountry(req, res, next) {
    try {
        const { id } = req.params;
        const { name, code, phone_code, is_active } = req.body;
        // 1. Check for duplicates excluding current id
        const { data: existing, error: checkError } = await supabaseClient_1.default
            .from('countries')
            .select('id, name, code')
            .or(`name.ilike.${name.trim()},code.ilike.${code.trim()}`);
        if (checkError) {
            logger_1.default.error('Error checking duplicate country update', { error: checkError });
            return res.status(500).json({ ok: false, message: 'Database check failed' });
        }
        const duplicates = existing?.filter((item) => String(item.id) !== String(id)) || [];
        if (duplicates.length > 0) {
            const match = duplicates[0];
            const field = match.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'code';
            return res.status(409).json({
                ok: false,
                message: `A country with this ${field} already exists.`,
            });
        }
        // 2. Update country
        const { data, error } = await supabaseClient_1.default
            .from('countries')
            .update({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            phone_code: phone_code ? phone_code.trim() : null,
            is_active: is_active ?? true,
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to update country', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update country' });
        }
        return res.status(200).json({ ok: true, data, message: 'Country updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function toggleCountryStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const { data, error } = await supabaseClient_1.default
            .from('countries')
            .update({ is_active })
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger_1.default.error('Failed to toggle country status', { error });
            return res.status(500).json({ ok: false, message: 'Failed to update status' });
        }
        return res.status(200).json({ ok: true, data, message: 'Status updated successfully' });
    }
    catch (error) {
        next(error);
    }
}
