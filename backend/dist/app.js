"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./super-admin/routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_1 = require("./middleware/requestId");
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(requestId_1.requestId);
app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms'));
app.use(rateLimit_1.apiRateLimiter);
// Health & readiness
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.json({ ready: true }));
// Mount the Super Admin API
app.use('/super-admin', routes_1.default);
// (When you add Company, you'll do the same:)
// import companyRouter from './company/routes';
// app.use('/company', companyRouter);
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
