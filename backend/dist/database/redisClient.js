"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = connectRedis;
const store = new Map();
const now = () => Date.now();
const seconds = (n) => n * 1000;
const cleanup = () => {
    const t = now();
    for (const [k, v] of store.entries()) {
        if (v.expiresAt !== null && v.expiresAt <= t)
            store.delete(k);
    }
};
const get = async (key) => {
    cleanup();
    const e = store.get(key);
    if (!e)
        return null;
    if (e.expiresAt !== null && e.expiresAt <= now()) {
        store.delete(key);
        return null;
    }
    return e.value;
};
const set = async (key, value, opts) => {
    cleanup();
    const ttl = typeof opts?.EX === 'number' ? seconds(opts.EX) : null;
    store.set(key, { value, expiresAt: ttl ? now() + ttl : null });
};
const del = async (key) => {
    store.delete(key);
};
const ttl = async (key) => {
    cleanup();
    const e = store.get(key);
    if (!e || e.expiresAt === null)
        return 0;
    const remainingMs = e.expiresAt - now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};
async function connectRedis() {
    console.warn('Redis disabled; using in-memory OTP store.');
}
const redis = {
    get,
    set,
    del,
    ttl,
    isOpen: false,
};
exports.default = redis;
