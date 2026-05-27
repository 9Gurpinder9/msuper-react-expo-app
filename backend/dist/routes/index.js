"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("../super-admin/routes"));
const routes_2 = __importDefault(require("../company/routes"));
const routes_3 = require("./routes");
// Central router: mount all feature routers here
const router = (0, express_1.Router)();
// Health and diagnostics
router.use('/healthz', routes_3.healthRouter); // GET /healthz
router.use('/test-database', routes_3.testDatabaseRouter); // GET /test-database
// Feature routers
router.use('/super-admin', routes_1.default);
router.use('/company', routes_2.default);
exports.default = router;
