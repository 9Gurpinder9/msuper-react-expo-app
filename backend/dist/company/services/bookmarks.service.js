"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBookmarks = listBookmarks;
exports.createBookmark = createBookmark;
exports.updateBookmark = updateBookmark;
exports.softDeleteBookmark = softDeleteBookmark;
exports.refreshBookmarkMeta = refreshBookmarkMeta;
const supabaseClient_1 = __importDefault(require("../../database/supabaseClient"));
const urlMeta_1 = require("../utils/urlMeta");
async function listBookmarks(filters) {
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = Math.max(filters.offset ?? 0, 0);
    let query = supabaseClient_1.default
        .from('bookmarks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (filters.deleted) {
        query = query.not('deleted_at', 'is', null);
    }
    else {
        query = query.is('deleted_at', null);
    }
    if (filters.favorite) {
        query = query.eq('is_favorite', true);
    }
    if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
    }
    if (filters.tag) {
        query = query.contains('tags', [filters.tag]);
    }
    if (filters.search) {
        const q = filters.search.replace(/%/g, '\\%');
        query = query.or(`title.ilike.%${q}%,url.ilike.%${q}%,description.ilike.%${q}%`);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { data: data ?? [], count: count ?? 0 };
}
async function createBookmark(payload) {
    const { data, error } = await supabaseClient_1.default
        .from('bookmarks')
        .insert([payload])
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateBookmark(id, payload) {
    const { data, error } = await supabaseClient_1.default
        .from('bookmarks')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function softDeleteBookmark(id) {
    const { data, error } = await supabaseClient_1.default
        .from('bookmarks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function refreshBookmarkMeta(id) {
    const { data, error } = await supabaseClient_1.default
        .from('bookmarks')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    const url = typeof data?.url === 'string' ? data.url.trim() : '';
    if (!url)
        return data;
    const meta = await (0, urlMeta_1.fetchUrlMetadata)(url);
    const updates = {};
    if (meta.thumbnail_url)
        updates.thumbnail_url = meta.thumbnail_url;
    if (meta.favicon_url)
        updates.favicon_url = meta.favicon_url;
    if (meta.og_title)
        updates.og_title = meta.og_title;
    if (meta.og_description)
        updates.og_description = meta.og_description;
    if (meta.og_image)
        updates.og_image = meta.og_image;
    if (Object.keys(updates).length === 0)
        return data;
    return updateBookmark(id, updates);
}
