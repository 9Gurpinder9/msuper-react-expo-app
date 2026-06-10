"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyResetPasswordConfirmSchema = exports.companyResetPasswordVerifyOtpSchema = exports.companyEmailOnlySchema = exports.companyVerifyOtpSchema = exports.companyLoginSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.updateBookmarkSchema = exports.createBookmarkSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBookmarkSchema = joi_1.default.object({
    title: joi_1.default.string().allow('', null).optional(),
    url: joi_1.default.string().uri().required(),
    description: joi_1.default.string().allow('', null),
    category_id: joi_1.default.string().uuid().required(),
    tags: joi_1.default.array().items(joi_1.default.string().min(1)).default([]),
    is_favorite: joi_1.default.boolean().default(false),
    thumbnail_url: joi_1.default.string().uri().allow('', null),
    favicon_url: joi_1.default.string().uri().allow('', null),
    og_title: joi_1.default.string().allow('', null),
    og_description: joi_1.default.string().allow('', null),
    og_image: joi_1.default.string().uri().allow('', null),
});
exports.updateBookmarkSchema = joi_1.default.object({
    title: joi_1.default.string().allow('', null).optional(),
    url: joi_1.default.string().uri().optional(),
    description: joi_1.default.string().allow('', null),
    category_id: joi_1.default.string().uuid().allow('', null),
    tags: joi_1.default.array().items(joi_1.default.string().min(1)).optional(),
    is_favorite: joi_1.default.boolean().optional(),
    thumbnail_url: joi_1.default.string().uri().allow('', null),
    favicon_url: joi_1.default.string().uri().allow('', null),
    og_title: joi_1.default.string().allow('', null),
    og_description: joi_1.default.string().allow('', null),
    og_image: joi_1.default.string().uri().allow('', null),
});
exports.createCategorySchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(80).required(),
});
exports.updateCategorySchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(80).required(),
});
exports.companyLoginSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().required(),
    password: joi_1.default.string().required(),
    captchaToken: joi_1.default.string().allow('', null).optional(),
});
exports.companyVerifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().required(),
    otp: joi_1.default.string().length(6).required(),
    rememberMe: joi_1.default.boolean().optional().default(false),
});
exports.companyEmailOnlySchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().required(),
});
exports.companyResetPasswordVerifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().required(),
    otp: joi_1.default.string().length(6).required(),
});
exports.companyResetPasswordConfirmSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().required(),
    resetToken: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required(),
});
