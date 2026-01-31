// frontend/config/index.ts
import Constants from 'expo-constants';

type Extra = {
  appVariant?: 'company' | 'super-admin';
  API_BASE_URL?: string;   // preferred (from app.config.js / .env)
  apiBaseUrl?: string;     // legacy fallback
  LOG_COLLECTOR_URL?: string;
  logCollectorUrl?: string;
  HCAPTCHA_SITE_KEY?: string;
  hcaptchaSiteKey?: string;
  HCAPTCHA_ENABLED?: string;
  hcaptchaEnabled?: string;
};

const extra = (Constants?.expoConfig?.extra ?? {}) as Extra;

const normalize = (u?: string) => (u ?? '').trim().replace(/\/+$/, '');

export const APP_VARIANT: 'company' | 'super-admin' =
  extra.appVariant ?? 'super-admin';

export const API_BASE_URL: string = normalize(
  extra.API_BASE_URL ?? extra.apiBaseUrl
);

export const LOG_COLLECTOR_URL: string = normalize(
  extra.LOG_COLLECTOR_URL ?? extra.logCollectorUrl ?? ''
);

export const HCAPTCHA_SITE_KEY: string = (extra.HCAPTCHA_SITE_KEY ?? extra.hcaptchaSiteKey ?? '').trim();
export const HCAPTCHA_ENABLED: boolean = String(
  extra.HCAPTCHA_ENABLED ?? extra.hcaptchaEnabled ?? 'true'
).toLowerCase() !== 'false';

/** Warn loudly if API base URL is missing so you don't hit `undefined/...` */
export function assertApiBaseUrl(): string {
  if (!API_BASE_URL) {
    console.warn(
      '[config] Missing API_BASE_URL. Set it in .env and app.config.js -> extra.API_BASE_URL, then `expo start --clear`.'
    );
  }
  return API_BASE_URL;
}

export default {
  APP_VARIANT,
  API_BASE_URL,
  LOG_COLLECTOR_URL,
  HCAPTCHA_SITE_KEY,
  HCAPTCHA_ENABLED,
  assertApiBaseUrl,
};
