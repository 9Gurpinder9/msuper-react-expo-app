"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = connectRedis;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.REDIS_URL;
let redis;
if (url) {
    const client = (0, redis_1.createClient)({ url });
    client.on('error', (err) => console.error('Redis Client Error', err));
    redis = client;
}
else {
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
    redis = {
        isOpen: false,
        get,
        set,
        del,
        ttl,
    };
}
async function connectRedis() {
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
                new Promise((resolve, reject) => setTimeout(() => reject(new Error(`Redis connect timeout after ${timeoutMs}ms`)), timeoutMs)),
            ]);
        }
        catch (err) {
            console.warn('Redis unavailable, proceeding without Redis:', err?.message || err);
        }
    }
}
exports.default = redis;
