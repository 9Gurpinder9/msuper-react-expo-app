"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = connectRedis;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('❌ Redis Client Error', err));
// Don't use top-level await
async function connectRedis() {
    if (!redis.isOpen)
        await redis.connect();
}
exports.default = redis;
