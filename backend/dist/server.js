"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const dotenv_1 = __importDefault(require("dotenv"));
const redisClient_1 = require("./database/redisClient");
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const PORT = config_1.config.port || 4000;
(async () => {
    try {
        await (0, redisClient_1.connectRedis)();
    }
    catch (err) {
        console.warn('Redis unavailable, starting server anyway:', err?.message || err);
    }
    app_1.default
        .listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
        .on('error', (err) => {
        console.error('Server failed to start:', err);
    });
})();
