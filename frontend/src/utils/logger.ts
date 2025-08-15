// src/utils/logger.ts
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Entry = { level: LogLevel; message: string; meta?: Record<string, any>; ts: number };

function format(e: Entry) {
    const ts = new Date(e.ts).toISOString();
    const meta = e.meta ? ` ${JSON.stringify(e.meta)}` : '';
    return `[${ts}] ${e.level.toUpperCase()}: ${e.message}${meta}`;
}

async function write(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry: Entry = { level, message, meta, ts: Date.now() };
    const line = format(entry);

    try {
        (console as any)[level] ? (console as any)[level](line, meta ?? {}) : console.log(line, meta ?? {});
    } catch { }

    // dev-only: send to Metro’s /dev-logs (no-op if not available)
    try {
        if (__DEV__) {
            // On web, use window.origin; on native, derive from expo hostUri if present
            let url: string | null = null;
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                url = `${window.location.origin}/dev-logs`;
            } else {
                // lazy import to avoid circular deps; also keeps this file platform-safe
                // @ts-ignore
                const Constants = (await import('expo-constants')).default;
                const host = (Constants as any)?.expoConfig?.hostUri as string | undefined;
                if (host) {
                    const base = host.startsWith('http') ? host : `http://${host}`;
                    url = `${base}/dev-logs`;
                }
            }
            if (url) {
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry),
                }).catch(() => { });
            }
        }
    } catch { }
}

export const logger = {
    debug: (m: string, meta?: Record<string, any>) => write('debug', m, meta),
    info: (m: string, meta?: Record<string, any>) => write('info', m, meta),
    warn: (m: string, meta?: Record<string, any>) => write('warn', m, meta),
    error: (m: string, meta?: Record<string, any>) => write('error', m, meta),
};

export function installGlobalErrorHandlers() {
    // React Native global handler (Android/iOS)
    // @ts-ignore
    const EU = (global as any).ErrorUtils;
    if (EU?.setGlobalHandler) {
        const prev = EU.getGlobalHandler?.();
        EU.setGlobalHandler((err: any, isFatal?: boolean) => {
            logger.error('UnhandledError', { message: String(err?.message ?? err), stack: String(err?.stack ?? ''), isFatal });
            prev?.(err, isFatal);
        });
    }

    // Web-only listeners (guard strictly to web)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('error', (e) => {
            logger.error('window.error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno });
        });
        window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
            logger.error('unhandledrejection', { reason: String((e as any).reason) });
        });
    }
}
