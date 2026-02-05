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

const authHeader = APP_SECRET ? { 'x-app-secret': APP_SECRET } : {};

type ListCategoriesParams = {
  limit?: number;
  offset?: number;
  query?: string;
};

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
  const res = await fetchJson<ListResponse>(`${base}/company/categories?${searchParams}`, {
    headers: {
      Accept: 'application/json',
      ...authHeader,
    },
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to load categories');
  }
  return res.data;
}

export async function createCategory(name: string) {
  const base = assertApiBaseUrl();
  const res = await fetchJson<ItemResponse>(`${base}/company/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
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
  const res = await fetchJson<ItemResponse>(`${base}/company/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify({ name }),
  });
  const message = (res.data as any)?.message as string | undefined;
  if (!res.ok || !res.data?.success) {
    throw new Error(message || 'Failed to update category');
  }
  return res.data.data;
}
