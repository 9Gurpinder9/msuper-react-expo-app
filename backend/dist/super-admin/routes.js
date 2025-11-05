"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const superAdmin_controller_1 = require("./controllers/superAdmin.controller");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("./schemas");
const router = (0, express_1.Router)();
router.post('/login', (0, validate_1.validate)(schemas_1.loginSchema), superAdmin_controller_1.loginHandler);
router.post('/verify-otp', (0, validate_1.validate)(schemas_1.verifyOtpSchema), superAdmin_controller_1.verifyOtpHandler);
router.post('/resend-otp', (0, validate_1.validate)(schemas_1.emailOnlySchema), superAdmin_controller_1.resendOtpHandler);
router.get('/dashboard', authenticate_1.default, superAdmin_controller_1.dashboardHandler);
exports.default = router;
