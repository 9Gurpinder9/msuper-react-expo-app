"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const authenticateCompany_1 = __importDefault(require("../middleware/authenticateCompany"));
// Auth controllers
const auth_controller_1 = require("./controllers/auth.controller");
// Bookmarks / Categories controllers
const bookmarks_controller_1 = require("./controllers/bookmarks.controller");
const categories_controller_1 = require("./controllers/categories.controller");
// Auth schemas
const schemas_1 = require("./schemas");
const router = (0, express_1.Router)();
// --- Public Auth Routes ---
router.post('/auth/login', (0, validate_1.validate)(schemas_1.companyLoginSchema), auth_controller_1.companyLoginHandler);
router.post('/auth/verify-otp', (0, validate_1.validate)(schemas_1.companyVerifyOtpSchema), auth_controller_1.companyVerifyOtpHandler);
router.post('/auth/resend-otp', (0, validate_1.validate)(schemas_1.companyEmailOnlySchema), auth_controller_1.companyResendOtpHandler);
router.post('/auth/reset-password/request', (0, validate_1.validate)(schemas_1.companyEmailOnlySchema), auth_controller_1.companyResetPasswordRequestHandler);
router.post('/auth/reset-password/verify-otp', (0, validate_1.validate)(schemas_1.companyResetPasswordVerifyOtpSchema), auth_controller_1.companyResetPasswordVerifyOtpHandler);
router.post('/auth/reset-password/confirm', (0, validate_1.validate)(schemas_1.companyResetPasswordConfirmSchema), auth_controller_1.companyResetPasswordConfirmHandler);
// --- Protected Workspace Routes ---
router.use(authenticateCompany_1.default);
router.get('/bookmarks', bookmarks_controller_1.listBookmarksHandler);
router.post('/bookmarks', (0, validate_1.validate)(schemas_1.createBookmarkSchema), bookmarks_controller_1.createBookmarkHandler);
router.put('/bookmarks/:id', (0, validate_1.validate)(schemas_1.updateBookmarkSchema), bookmarks_controller_1.updateBookmarkHandler);
router.delete('/bookmarks/:id', bookmarks_controller_1.deleteBookmarkHandler);
router.post('/bookmarks/:id/refresh-meta', bookmarks_controller_1.refreshBookmarkMetaHandler);
router.get('/categories', categories_controller_1.listCategoriesHandler);
router.post('/categories', (0, validate_1.validate)(schemas_1.createCategorySchema), categories_controller_1.createCategoryHandler);
router.put('/categories/:id', (0, validate_1.validate)(schemas_1.updateCategorySchema), categories_controller_1.updateCategoryHandler);
exports.default = router;
