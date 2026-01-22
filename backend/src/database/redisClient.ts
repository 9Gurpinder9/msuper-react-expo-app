// In-memory OTP store (Redis removed)
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

export async function connectRedis() {
  console.warn('Redis disabled; using in-memory OTP store.');
}

const redis = {
  get,
  set,
  del,
  ttl,
  isOpen: false,
} as const;

export default redis;
