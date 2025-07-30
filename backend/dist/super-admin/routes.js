"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = __importDefault(require("../middleware/authenticate"));
const superAdmin_controller_1 = require("./controllers/superAdmin.controller");
const router = (0, express_1.Router)();
router.post('/login', superAdmin_controller_1.loginHandler);
router.post('/verify-otp', superAdmin_controller_1.verifyOtpHandler);
router.get('/dashboard', authenticate_1.default, superAdmin_controller_1.dashboardHandler);
exports.default = router;
