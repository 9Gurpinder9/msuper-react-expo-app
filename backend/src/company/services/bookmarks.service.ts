import supabase from '../../database/supabaseClient';
import { fetchUrlMetadata } from '../utils/urlMeta';

export type BookmarkFilters = {
  search?: string;
  favorite?: boolean;
  category_id?: string;
  tag?: string;
  deleted?: boolean;
  limit?: number;
  offset?: number;
};

export async function listBookmarks(filters: BookmarkFilters) {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = supabase
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.deleted) {
    query = query.not('deleted_at', 'is', null);
  } else {
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
    query = query.or(
      `title.ilike.%${q}%,url.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function createBookmark(payload: Record<string, any>) {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookmark(id: string, payload: Record<string, any>) {
  const { data, error } = await supabase
    .from('bookmarks')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteBookmark(id: string) {
  const { data, error } = await supabase
    .from('bookmarks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function refreshBookmarkMeta(id: string) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const url = typeof data?.url === 'string' ? data.url.trim() : '';
  if (!url) return data;

  const meta = await fetchUrlMetadata(url);
  const updates: Record<string, string> = {};
  if (meta.thumbnail_url) updates.thumbnail_url = meta.thumbnail_url;
  if (meta.favicon_url) updates.favicon_url = meta.favicon_url;
  if (meta.og_title) updates.og_title = meta.og_title;
  if (meta.og_description) updates.og_description = meta.og_description;
  if (meta.og_image) updates.og_image = meta.og_image;
  if (Object.keys(updates).length === 0) return data;

  return updateBookmark(id, updates);
}
