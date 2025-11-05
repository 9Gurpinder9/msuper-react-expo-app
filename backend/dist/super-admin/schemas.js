"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.emailOnlySchema = exports.loginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
        'any.required': 'Email is required.',
    }),
    password: joi_1.default.string().min(6).required().messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.',
    }),
});
exports.emailOnlySchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
        'any.required': 'Email is required.',
    }),
});
exports.verifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required(),
    otp: joi_1.default.string().trim().required(),
});
