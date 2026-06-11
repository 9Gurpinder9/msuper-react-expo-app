import { Router } from 'express';
import { validate } from '../middleware/validate';
import authenticateCompany from '../middleware/authenticateCompany';

// Auth controllers
import {
  companyLoginHandler,
  companyVerifyOtpHandler,
  companyResendOtpHandler,
  companyResetPasswordRequestHandler,
  companyResetPasswordVerifyOtpHandler,
  companyResetPasswordConfirmHandler
} from './controllers/auth.controller';

// Bookmarks / Categories controllers
import {
  listBookmarksHandler,
  createBookmarkHandler,
  updateBookmarkHandler,
  deleteBookmarkHandler,
  refreshBookmarkMetaHandler,
} from './controllers/bookmarks.controller';

import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
} from './controllers/categories.controller';

import { getMenuPermissionsHandler } from './controllers/menuPermissions.controller';

// Auth schemas
import {
  companyLoginSchema,
  companyVerifyOtpSchema,
  companyEmailOnlySchema,
  companyResetPasswordVerifyOtpSchema,
  companyResetPasswordConfirmSchema,
  createBookmarkSchema,
  updateBookmarkSchema,
  createCategorySchema,
  updateCategorySchema,
} from './schemas';

const router = Router();

// --- Public Auth Routes ---
router.post('/auth/login', validate(companyLoginSchema), companyLoginHandler);
router.post('/auth/verify-otp', validate(companyVerifyOtpSchema), companyVerifyOtpHandler);
router.post('/auth/resend-otp', validate(companyEmailOnlySchema), companyResendOtpHandler);
router.post('/auth/reset-password/request', validate(companyEmailOnlySchema), companyResetPasswordRequestHandler);
router.post('/auth/reset-password/verify-otp', validate(companyResetPasswordVerifyOtpSchema), companyResetPasswordVerifyOtpHandler);
router.post('/auth/reset-password/confirm', validate(companyResetPasswordConfirmSchema), companyResetPasswordConfirmHandler);

// --- Protected Workspace Routes ---
router.use(authenticateCompany);

router.get('/features', getMenuPermissionsHandler);

router.get('/bookmarks', listBookmarksHandler);
router.post('/bookmarks', validate(createBookmarkSchema), createBookmarkHandler);
router.put('/bookmarks/:id', validate(updateBookmarkSchema), updateBookmarkHandler);
router.delete('/bookmarks/:id', deleteBookmarkHandler);
router.post('/bookmarks/:id/refresh-meta', refreshBookmarkMetaHandler);

router.get('/categories', listCategoriesHandler);
router.post('/categories', validate(createCategorySchema), createCategoryHandler);
router.put('/categories/:id', validate(updateCategorySchema), updateCategoryHandler);

export default router;
