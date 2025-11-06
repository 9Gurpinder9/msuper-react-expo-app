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
    client.on('error', (err) => console.error('❌ Redis Client Error', err));
    redis = client;
}
else {
    const noop = async () => { };
    const zero = async () => 0;
    const nil = async () => null;
    redis = {
        isOpen: false,
        // best-effort no-op implementations for local dev without Redis
        get: nil,
        set: noop,
        del: noop,
        ttl: zero,
    };
}
async function connectRedis() {
    if (!url) {
        console.warn('Redis URL not set; skipping Redis connection.');
        return;
    }
    if (!redis.isOpen && typeof redis.connect === 'function') {
        await redis.connect();
    }
}
exports.default = redis;
