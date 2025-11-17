"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseRouter = exports.healthRouter = void 0;
// src/routes.ts
const express_1 = require("express");
const testConnection_1 = require("../database/testConnection");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * A simple liveness / health‑check endpoint
 */
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});
// Removed legacy: testSupabaseRouter (use testDatabaseRouter instead)
/**
 * Test database connectivity via Supabase
 * GET /test-database
 * Returns whether Supabase is reachable and if a trivial query succeeded
 */
exports.testDatabaseRouter = (0, express_1.Router)();
exports.testDatabaseRouter.get('/', async (req, res, next) => {
    try {
        const result = await (0, testConnection_1.checkSupabaseConnection)();
        if (result.ok) {
            return res.json({
                connected: true,
                querySucceeded: true,
                rows: result.rows ?? 0,
                status: result.status ?? 200,
                timestamp: new Date().toISOString()
            });
        }
        if (result.reachable) {
            // Supabase reachable but query failed (e.g., table missing/permissions)
            logger_1.default.warn(`Supabase reachable but query failed: ${result.error?.message}`);
            return res.json({
                connected: true,
                querySucceeded: false,
                error: result.error,
                status: result.status ?? 200,
                timestamp: new Date().toISOString()
            });
        }
        // Not reachable at all
        return res.status(503).json({
            connected: false,
            querySucceeded: false,
            error: result.error,
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
        logger_1.default.error(`[Test-Database Error] ${err?.message || err}`);
        next(err);
    }
});
