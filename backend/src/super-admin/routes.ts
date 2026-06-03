import { Router } from 'express';
import authenticate from '../middleware/authenticate';
import {
    loginHandler,
    verifyOtpHandler,
    dashboardHandler,
    resendOtpHandler,
    resetPasswordRequestHandler,
    resetPasswordVerifyOtpHandler,
    resetPasswordConfirmHandler
} from './controllers/superAdmin.controller';
import { onlineScanBillHandler } from './controllers/documentAi.controller';
import {
    getCountries,
    createCountry,
    updateCountry,
    toggleCountryStatus
} from './controllers/country.controller';
import {
    getStates,
    createState,
    updateState,
    toggleStateStatus
} from './controllers/state.controller';
import {
    getCities,
    createCity,
    updateCity,
    toggleCityStatus
} from './controllers/city.controller';
import {
    getSubscriptionPlans,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    toggleSubscriptionPlanStatus
} from './controllers/subscriptionPlan.controller';
import {
    getFeatures,
    createFeature,
    updateFeature,
    toggleFeatureStatus
} from './controllers/feature.controller';
import {
    getRoles,
    createRole,
    updateRole,
    toggleRoleStatus
} from './controllers/role.controller';
import {
    getRolePermissions,
    updateRolePermissions
} from './controllers/roleFeature.controller';
import { validate } from '../middleware/validate';
import {
    loginSchema,
    emailOnlySchema,
    verifyOtpSchema,
    resetPasswordRequestSchema,
    resetPasswordVerifyOtpSchema,
    resetPasswordConfirmSchema,
    onlineScanBillSchema,
    createCountrySchema,
    updateCountrySchema,
    toggleCountryStatusSchema,
    createStateSchema,
    updateStateSchema,
    toggleStateStatusSchema,
    createCitySchema,
    updateCitySchema,
    toggleCityStatusSchema,
    createSubscriptionPlanSchema,
    updateSubscriptionPlanSchema,
    toggleSubscriptionPlanStatusSchema,
    createFeatureSchema,
    updateFeatureSchema,
    toggleFeatureStatusSchema,
    createRoleSchema,
    updateRoleSchema,
    toggleRoleStatusSchema,
    updateRolePermissionsSchema
} from './schemas';

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtpHandler);
router.post('/resend-otp', validate(emailOnlySchema), resendOtpHandler);
router.post('/reset-password/request', validate(resetPasswordRequestSchema), resetPasswordRequestHandler);
router.post('/reset-password/verify-otp', validate(resetPasswordVerifyOtpSchema), resetPasswordVerifyOtpHandler);
router.post('/reset-password/confirm', validate(resetPasswordConfirmSchema), resetPasswordConfirmHandler);
router.get('/dashboard', authenticate, dashboardHandler);
router.post('/online-scan-bill', authenticate, validate(onlineScanBillSchema), onlineScanBillHandler);

// Countries CRUD
router.get('/countries', authenticate, getCountries);
router.post('/countries', authenticate, validate(createCountrySchema), createCountry);
router.put('/countries/:id', authenticate, validate(updateCountrySchema), updateCountry);
router.patch('/countries/:id/status', authenticate, validate(toggleCountryStatusSchema), toggleCountryStatus);

// States CRUD
router.get('/states', authenticate, getStates);
router.post('/states', authenticate, validate(createStateSchema), createState);
router.put('/states/:id', authenticate, validate(updateStateSchema), updateState);
router.patch('/states/:id/status', authenticate, validate(toggleStateStatusSchema), toggleStateStatus);

// Cities CRUD
router.get('/cities', authenticate, getCities);
router.post('/cities', authenticate, validate(createCitySchema), createCity);
router.put('/cities/:id', authenticate, validate(updateCitySchema), updateCity);
router.patch('/cities/:id/status', authenticate, validate(toggleCityStatusSchema), toggleCityStatus);

// Subscription Plans CRUD
router.get('/subscription-plans', authenticate, getSubscriptionPlans);
router.post('/subscription-plans', authenticate, validate(createSubscriptionPlanSchema), createSubscriptionPlan);
router.put('/subscription-plans/:id', authenticate, validate(updateSubscriptionPlanSchema), updateSubscriptionPlan);
router.patch('/subscription-plans/:id/status', authenticate, validate(toggleSubscriptionPlanStatusSchema), toggleSubscriptionPlanStatus);

// Features CRUD
router.get('/features', authenticate, getFeatures);
router.post('/features', authenticate, validate(createFeatureSchema), createFeature);
router.put('/features/:id', authenticate, validate(updateFeatureSchema), updateFeature);
router.patch('/features/:id/status', authenticate, validate(toggleFeatureStatusSchema), toggleFeatureStatus);

// Roles CRUD
router.get('/roles', authenticate, getRoles);
router.post('/roles', authenticate, validate(createRoleSchema), createRole);
router.put('/roles/:id', authenticate, validate(updateRoleSchema), updateRole);
router.patch('/roles/:id/status', authenticate, validate(toggleRoleStatusSchema), toggleRoleStatus);
router.get('/roles/:roleId/permissions', authenticate, getRolePermissions);
router.post('/roles/:roleId/permissions', authenticate, validate(updateRolePermissionsSchema), updateRolePermissions);

export default router;
