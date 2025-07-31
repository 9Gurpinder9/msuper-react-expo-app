// frontend/config/index.ts
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
export const APP_VARIANT = extra.appVariant as 'company' | 'super-admin';
export const API_BASE_URL = extra.apiBaseUrl as string;
