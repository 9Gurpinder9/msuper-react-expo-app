// src/utils/network.ts
import { logger } from './logger';

export type FetchJsonResult<T = any> = {
    ok: boolean;
    status: number;
    data: T | null;
    raw: string;
    headers: Headers;
};

export async function fetchJson<T = any>(url: string, init: RequestInit = {}): Promise<FetchJsonResult<T>> {
    const started = Date.now();
    logger.info('HTTP →', { url, method: init.method || 'GET' });

    const res = await fetch(url, init);
    const raw = await res.text(); // read once
    const duration = Date.now() - started;

    let data: T | null = null;
    try { data = raw ? (JSON.parse(raw) as T) : null; }
    catch { logger.warn('HTTP JSON parse failed', { url, status: res.status, rawPreview: raw.slice(0, 400) }); }

    logger.info('HTTP ←', {
        url,
        status: res.status,
        ok: res.ok,
        durationMs: duration,
        contentType: res.headers.get('content-type'),
        rawPreview: raw.slice(0, 400),
    });

    return { ok: res.ok, status: res.status, data, raw, headers: res.headers };
}
