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
import { getCompanyProfileHandler, updateCompanyProfileHandler } from './controllers/profile.controller';

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
  updateCompanyProfileSchema,
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

router.get('/profile', getCompanyProfileHandler);
router.put('/profile', validate(updateCompanyProfileSchema), updateCompanyProfileHandler);

router.get('/bookmarks', listBookmarksHandler);
router.post('/bookmarks', validate(createBookmarkSchema), createBookmarkHandler);
router.put('/bookmarks/:id', validate(updateBookmarkSchema), updateBookmarkHandler);
router.delete('/bookmarks/:id', deleteBookmarkHandler);
router.post('/bookmarks/:id/refresh-meta', refreshBookmarkMetaHandler);

router.get('/categories', listCategoriesHandler);
router.post('/categories', validate(createCategorySchema), createCategoryHandler);
router.put('/categories/:id', validate(updateCategorySchema), updateCategoryHandler);

// --- Protected Attendance Routes ---
import {
  getPunchStatusHandler,
  punchInHandler,
  punchOutHandler,
  getAttendanceHistoryHandler,
  getMonthlyReportHandler
} from './controllers/attendance.controller';
import { punchInSchema, punchOutSchema } from './schemas';

router.get('/attendance/status', getPunchStatusHandler);
router.post('/attendance/punch-in', validate(punchInSchema), punchInHandler);
router.post('/attendance/punch-out', validate(punchOutSchema), punchOutHandler);
router.get('/attendance/history', getAttendanceHistoryHandler);
router.get('/attendance/report', getMonthlyReportHandler);

export default router;
