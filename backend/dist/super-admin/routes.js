"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const superAdmin_controller_1 = require("./controllers/superAdmin.controller");
const documentAi_controller_1 = require("./controllers/documentAi.controller");
const country_controller_1 = require("./controllers/country.controller");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("./schemas");
const router = (0, express_1.Router)();
router.post('/login', (0, validate_1.validate)(schemas_1.loginSchema), superAdmin_controller_1.loginHandler);
router.post('/verify-otp', (0, validate_1.validate)(schemas_1.verifyOtpSchema), superAdmin_controller_1.verifyOtpHandler);
router.post('/resend-otp', (0, validate_1.validate)(schemas_1.emailOnlySchema), superAdmin_controller_1.resendOtpHandler);
router.post('/reset-password/request', (0, validate_1.validate)(schemas_1.resetPasswordRequestSchema), superAdmin_controller_1.resetPasswordRequestHandler);
router.post('/reset-password/verify-otp', (0, validate_1.validate)(schemas_1.resetPasswordVerifyOtpSchema), superAdmin_controller_1.resetPasswordVerifyOtpHandler);
router.post('/reset-password/confirm', (0, validate_1.validate)(schemas_1.resetPasswordConfirmSchema), superAdmin_controller_1.resetPasswordConfirmHandler);
router.get('/dashboard', authenticate_1.default, superAdmin_controller_1.dashboardHandler);
router.post('/online-scan-bill', authenticate_1.default, (0, validate_1.validate)(schemas_1.onlineScanBillSchema), documentAi_controller_1.onlineScanBillHandler);
// Countries CRUD
router.get('/countries', authenticate_1.default, country_controller_1.getCountries);
router.post('/countries', authenticate_1.default, (0, validate_1.validate)(schemas_1.createCountrySchema), country_controller_1.createCountry);
router.put('/countries/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateCountrySchema), country_controller_1.updateCountry);
router.patch('/countries/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleCountryStatusSchema), country_controller_1.toggleCountryStatus);
exports.default = router;
