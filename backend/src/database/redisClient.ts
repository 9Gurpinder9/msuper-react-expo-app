import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.REDIS_URL;

let redis: any;

if (url) {
  const client = createClient({ url });
  client.on('error', (err) => console.error('❌ Redis Client Error', err));
  redis = client as any;
} else {
  const noop = async () => {};
  const zero = async () => 0 as number;
  const nil = async () => null as unknown as string | null;
  redis = {
    isOpen: false,
    // best-effort no-op implementations for local dev without Redis
    get: nil as any,
    set: noop as any,
    del: noop as any,
    ttl: zero as any,
  } as any;
}

export async function connectRedis() {
  if (!url) {
    console.warn('Redis URL not set; skipping Redis connection.');
    return;
  }
  if (!redis.isOpen && typeof redis.connect === 'function') {
    await redis.connect();
  }
}

export default redis;
