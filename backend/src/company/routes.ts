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

// User management controllers
import {
  getCompanyRolesHandler,
  getCompanyUsersHandler,
  createCompanyUserHandler,
  updateCompanyUserHandler,
  toggleUserStatusHandler,
  sendUserVerificationHandler,
  verifyUserEmailHandler
} from './controllers/user.controller';

// Location controllers
import { getCountries } from '../super-admin/controllers/country.controller';
import { getStates } from '../super-admin/controllers/state.controller';
import { getCities } from '../super-admin/controllers/city.controller';

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
  companyCreateUserSchema,
  companyUpdateUserSchema,
  toggleUserStatusSchema,
  verifyUserEmailSchema,
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

// --- Protected User Management Routes (Restricted to ADMIN role in controller) ---
router.get('/roles', getCompanyRolesHandler);
router.get('/users', getCompanyUsersHandler);
router.post('/users', validate(companyCreateUserSchema), createCompanyUserHandler);
router.put('/users/:id', validate(companyUpdateUserSchema), updateCompanyUserHandler);
router.patch('/users/:id/status', validate(toggleUserStatusSchema), toggleUserStatusHandler);
router.post('/users/:id/send-verification', sendUserVerificationHandler);
router.post('/users/:id/verify-email', validate(verifyUserEmailSchema), verifyUserEmailHandler);

// --- Protected Location Lookup Routes (Read-only for selector forms) ---
router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);

export default router;
