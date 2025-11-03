import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';

type LoginPayload = { email: string; password: string };
type VerifyOtpPayload = { email: string; otp: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const authService = {
  login(body: LoginPayload) {
    return request<{ success: boolean; message: string }>(`/super-admin/login`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  verifyOtp(body: VerifyOtpPayload) {
    return request<{ success: boolean; token?: string; message: string }>(
      `/super-admin/verify-otp`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  },
  resendOtp(email: string) {
    return request<{ success: boolean; message: string }>(`/super-admin/resend-otp`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  dashboard(token: string) {
    return request<{ success: boolean; message: string }>(`/super-admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

