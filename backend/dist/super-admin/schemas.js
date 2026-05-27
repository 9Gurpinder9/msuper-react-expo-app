"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineScanBillSchema = exports.resetPasswordConfirmSchema = exports.resetPasswordVerifyOtpSchema = exports.resetPasswordRequestSchema = exports.verifyOtpSchema = exports.emailOnlySchema = exports.loginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
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
    captchaToken: joi_1.default.string().trim().min(10).optional().messages({
        'string.empty': 'Captcha is required.',
        'string.min': 'Captcha is invalid.',
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
exports.resetPasswordRequestSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
        'any.required': 'Email is required.',
    }),
});
exports.resetPasswordVerifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required(),
    otp: joi_1.default.string().trim().required(),
});
exports.resetPasswordConfirmSchema = joi_1.default.object({
    email: joi_1.default.string().trim().lowercase().email().required(),
    resetToken: joi_1.default.string().trim().required(),
    newPassword: joi_1.default.string()
        .pattern(passwordPattern)
        .required()
        .messages({
        'string.pattern.base': 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.',
    }),
    confirmPassword: joi_1.default.any()
        .valid(joi_1.default.ref('newPassword'))
        .required()
        .messages({ 'any.only': 'Passwords do not match.' }),
});
exports.onlineScanBillSchema = joi_1.default.object({
    imageBase64: joi_1.default.string().trim().min(50).messages({
        'string.empty': 'File is required.',
        'string.min': 'File data is too short.',
    }),
    mimeType: joi_1.default.string().trim().optional(),
    files: joi_1.default.array()
        .items(joi_1.default.object({
        imageBase64: joi_1.default.string().trim().min(50).required().messages({
            'string.empty': 'File is required.',
            'string.min': 'File data is too short.',
        }),
        mimeType: joi_1.default.string().trim().optional(),
    }))
        .min(1)
        .messages({
        'array.min': 'At least one file is required.',
    }),
})
    .xor('imageBase64', 'files')
    .messages({
    'object.missing': 'File is required.',
    'object.xor': 'Provide a single file or a list of files, not both.',
});
