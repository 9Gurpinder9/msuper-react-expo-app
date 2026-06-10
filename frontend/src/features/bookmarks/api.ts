import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, APP_SECRET, assertApiBaseUrl } from '../../../config';
import { fetchJson } from '../../utils/network';
import type { Bookmark, BookmarkFilters, BookmarkInput, BookmarkUpdateInput } from './types';

type ListResponse = { success: boolean; data: Bookmark[]; count: number };
type ItemResponse = { success: boolean; data: Bookmark };

const buildQuery = (filters: BookmarkFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.favorite) params.set('favorite', 'true');
  if (filters.category_id) params.set('category_id', filters.category_id);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.deleted) params.set('deleted', 'true');
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));
  if (typeof filters.offset === 'number') params.set('offset', String(filters.offset));
  return params.toString();
};

async function getHeaders(isJson = false) {
  const token = await AsyncStorage.getItem('companyToken');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (APP_SECRET) {
    headers['x-app-secret'] = APP_SECRET;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function listBookmarks(filters: BookmarkFilters) {
  const base = assertApiBaseUrl();
  const query = buildQuery(filters);
  const url = `${base}/company/bookmarks${query ? `?${query}` : ''}`;
  const headers = await getHeaders();
  const res = await fetchJson<ListResponse>(url, {
    headers,
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to load bookmarks');
  }
  return res.data;
}

export async function createBookmark(input: BookmarkInput) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders(true);
  const res = await fetchJson<ItemResponse>(`${base}/company/bookmarks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to create bookmark');
  }
  return res.data.data;
}

export async function updateBookmark(id: string, input: BookmarkUpdateInput) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders(true);
  const res = await fetchJson<ItemResponse>(`${base}/company/bookmarks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to update bookmark');
  }
  return res.data.data;
}

export async function deleteBookmark(id: string) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders();
  const res = await fetchJson<ItemResponse>(`${base}/company/bookmarks/${id}`, {
    method: 'DELETE',
    headers,
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to delete bookmark');
  }
  return res.data.data;
}

export async function refreshBookmarkMeta(id: string) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders();
  const res = await fetchJson<ItemResponse>(`${base}/company/bookmarks/${id}/refresh-meta`, {
    method: 'POST',
    headers,
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to refresh metadata');
  }
  return res.data.data;
}
