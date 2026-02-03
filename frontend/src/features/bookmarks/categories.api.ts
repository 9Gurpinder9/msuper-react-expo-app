import { API_BASE_URL, APP_SECRET, assertApiBaseUrl } from '../../../config';
import { fetchJson } from '../../utils/network';
import type { Category } from './types';

type ListResponse = { success: boolean; data: Category[] };
type ItemResponse = { success: boolean; data: Category };

const authHeader = APP_SECRET ? { 'x-app-secret': APP_SECRET } : {};

export async function listCategories() {
  const base = assertApiBaseUrl();
  const res = await fetchJson<ListResponse>(`${base}/company/categories`, {
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
