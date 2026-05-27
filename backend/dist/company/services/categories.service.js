"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const TABLE = 'bookmark_categories';
async function listCategories(params) {
    const { limit, offset, search } = params;
    let query = supabaseClient_1.default.from(TABLE).select('*', { count: 'exact' }).order('name');
    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error)
        throw error;
    return {
        data: data ?? [],
        total: count ?? 0,
    };
}
async function createCategory(name) {
    const { data: existing, error: existingError } = await supabaseClient_1.default
        .from(TABLE)
        .select('id')
        .ilike('name', name)
        .limit(1);
    if (existingError)
        throw existingError;
    if (existing && existing.length > 0) {
        const err = new Error('Category name already exists.');
        err.statusCode = 409;
        throw err;
    }
    const { data, error } = await supabaseClient_1.default
        .from(TABLE)
        .insert([{ name }])
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateCategory(id, name) {
    const { data: existing, error: existingError } = await supabaseClient_1.default
        .from(TABLE)
        .select('id')
        .ilike('name', name)
        .limit(1);
    if (existingError)
        throw existingError;
    if (existing && existing.length > 0 && existing[0].id !== id) {
        const err = new Error('Category name already exists.');
        err.statusCode = 409;
        throw err;
    }
    const { data, error } = await supabaseClient_1.default
        .from(TABLE)
        .update({ name })
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
