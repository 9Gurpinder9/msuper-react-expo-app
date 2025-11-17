import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.REDIS_URL;

let redis: any;

if (url) {
  const client = createClient({ url });
  client.on('error', (err) => console.error('Redis Client Error', err));
  redis = client as any;
} else {
  // In-memory fallback for local/dev usage to allow OTP flows without Redis
  type Entry = { value: string; expiresAt: number | null };
  const store = new Map<string, Entry>();

  const now = () => Date.now();
  const seconds = (n: number) => n * 1000;

  const cleanup = () => {
    const t = now();
    for (const [k, v] of store.entries()) {
      if (v.expiresAt !== null && v.expiresAt <= t) store.delete(k);
    }
  };

  const get = async (key: string): Promise<string | null> => {
    cleanup();
    const e = store.get(key);
    if (!e) return null;
    if (e.expiresAt !== null && e.expiresAt <= now()) {
      store.delete(key);
      return null;
    }
    return e.value;
  };

  const set = async (key: string, value: string, opts?: { EX?: number }) => {
    cleanup();
    const ttl = typeof opts?.EX === 'number' ? seconds(opts!.EX!) : null;
    store.set(key, { value, expiresAt: ttl ? now() + ttl : null });
  };

  const del = async (key: string) => {
    store.delete(key);
  };

  const ttl = async (key: string): Promise<number> => {
    cleanup();
    const e = store.get(key);
    if (!e || e.expiresAt === null) return 0;
    const remainingMs = e.expiresAt - now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  };

  redis = {
    isOpen: false,
    get,
    set,
    del,
    ttl,
  } as any;
}

export async function connectRedis() {
  if (!url) {
    console.warn('Redis URL not set; using in-memory store (dev only).');
    return;
  }
  if (!redis.isOpen && typeof redis.connect === 'function') {
    // Avoid hanging the server startup when Redis host is unreachable in dev
    const timeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 1000);
    try {
      await Promise.race([
        redis.connect(),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error(`Redis connect timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } catch (err: any) {
      console.warn('Redis unavailable, proceeding without Redis:', err?.message || err);
    }
  }
}

export default redis;
