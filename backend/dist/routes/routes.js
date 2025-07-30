"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSupabaseRouter = exports.healthRouter = void 0;
// src/routes.ts
const express_1 = require("express");
const supabaseClient_1 = __importDefault(require("../database/supabaseClient"));
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
/**
 * A small router to hit your Supabase instance
 */
exports.testSupabaseRouter = (0, express_1.Router)();
exports.testSupabaseRouter.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabaseClient_1.default
            .from('test_data')
            .select('*')
            .limit(1);
        if (error)
            throw error;
        logger_1.default.info('Fetched test_data from Supabase');
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.default.error(`[Supabase Error] ${err.message}`);
        next(err);
    }
});
