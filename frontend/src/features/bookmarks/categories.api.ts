import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, APP_SECRET, assertApiBaseUrl } from '../../../config';
import { fetchJson } from '../../utils/network';
import type { Category } from './types';

type ListResponse = {
  success: boolean;
  data: Category[];
  total: number;
  limit: number;
  offset: number;
};
type ItemResponse = { success: boolean; data: Category };

type ListCategoriesParams = {
  limit?: number;
  offset?: number;
  query?: string;
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

export async function listCategories(params: ListCategoriesParams) {
  const base = assertApiBaseUrl();
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const query = params.query?.trim();
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (query) {
    searchParams.set('q', query);
  }
  const headers = await getHeaders();
  const res = await fetchJson<ListResponse>(`${base}/company/categories?${searchParams}`, {
    headers,
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to load categories');
  }
  return res.data;
}

export async function createCategory(name: string) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders(true);
  const res = await fetchJson<ItemResponse>(`${base}/company/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to create category');
  }
  return res.data.data;
}

export async function updateCategory(id: string, name: string) {
  const base = assertApiBaseUrl();
  const headers = await getHeaders(true);
  const res = await fetchJson<ItemResponse>(`${base}/company/categories/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name }),
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to update category');
  }
  return res.data.data;
}
