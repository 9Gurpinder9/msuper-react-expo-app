import { createClient, type RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.REDIS_URL;
let client: RedisClientType | null = null;
let connecting: Promise<void> | null = null;

// In-memory fallback to keep OTP flows working when Redis is unavailable
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

const memGet = async (key: string): Promise<string | null> => {
  cleanup();
  const e = store.get(key);
  if (!e) return null;
  if (e.expiresAt !== null && e.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return e.value;
};

const memSet = async (key: string, value: string, opts?: { EX?: number }) => {
  cleanup();
  const ttl = typeof opts?.EX === 'number' ? seconds(opts!.EX!) : null;
  store.set(key, { value, expiresAt: ttl ? now() + ttl : null });
};

const memDel = async (key: string) => {
  store.delete(key);
};

const memTtl = async (key: string): Promise<number> => {
  cleanup();
  const e = store.get(key);
  if (!e || e.expiresAt === null) return 0;
  const remainingMs = e.expiresAt - now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

if (url) {
  client = createClient({ url });
  client.on('error', (err) => console.error('Redis Client Error', err));
}

async function ensureConnected() {
  if (!client) return;
  if (client.isOpen) return;
  if (connecting) return connecting;

  const timeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 1000);
  connecting = Promise.race([
    client.connect(),
    new Promise<void>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Redis connect timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
    .then(() => undefined)
    .catch((err: any) => {
      console.warn('Redis unavailable, falling back to in-memory:', err?.message || err);
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    await ensureConnected();
    if (client && client.isOpen) return await client.get(key);
  } catch (err: any) {
    console.warn('Redis get failed, using in-memory:', err?.message || err);
  }
  return memGet(key);
}

async function safeSet(key: string, value: string, opts?: { EX?: number }) {
  try {
    await ensureConnected();
    if (client && client.isOpen) {
      await client.set(key, value, opts?.EX ? { EX: opts.EX } : undefined);
      return;
    }
  } catch (err: any) {
    console.warn('Redis set failed, using in-memory:', err?.message || err);
  }
  await memSet(key, value, opts);
}

async function safeDel(key: string) {
  try {
    await ensureConnected();
    if (client && client.isOpen) {
      await client.del(key);
      return;
    }
  } catch (err: any) {
    console.warn('Redis del failed, using in-memory:', err?.message || err);
  }
  await memDel(key);
}

async function safeTtl(key: string): Promise<number> {
  try {
    await ensureConnected();
    if (client && client.isOpen) return await client.ttl(key);
  } catch (err: any) {
    console.warn('Redis ttl failed, using in-memory:', err?.message || err);
  }
  return memTtl(key);
}

export async function connectRedis() {
  if (!url) {
    console.warn('Redis URL not set; using in-memory store (dev only).');
    return;
  }
  await ensureConnected();
}

const redis = {
  get: safeGet,
  set: safeSet,
  del: safeDel,
  ttl: safeTtl,
  get isOpen() {
    return client?.isOpen ?? false;
  },
} as const;

export default redis;
