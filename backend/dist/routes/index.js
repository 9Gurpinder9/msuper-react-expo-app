"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("../super-admin/routes"));
const routes_2 = require("./routes");
// Central router: mount all feature routers here
const router = (0, express_1.Router)();
// Health and diagnostics
router.use('/healthz', routes_2.healthRouter); // GET /healthz
router.use('/test-database', routes_2.testDatabaseRouter); // GET /test-database
// Feature routers
router.use('/super-admin', routes_1.default);
exports.default = router;
