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
const state_controller_1 = require("./controllers/state.controller");
const city_controller_1 = require("./controllers/city.controller");
const subscriptionPlan_controller_1 = require("./controllers/subscriptionPlan.controller");
const feature_controller_1 = require("./controllers/feature.controller");
const role_controller_1 = require("./controllers/role.controller");
const roleFeature_controller_1 = require("./controllers/roleFeature.controller");
const companyCategory_controller_1 = require("./controllers/companyCategory.controller");
const company_controller_1 = require("./controllers/company.controller");
const companyFeature_controller_1 = require("./controllers/companyFeature.controller");
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
// States CRUD
router.get('/states', authenticate_1.default, state_controller_1.getStates);
router.post('/states', authenticate_1.default, (0, validate_1.validate)(schemas_1.createStateSchema), state_controller_1.createState);
router.put('/states/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateStateSchema), state_controller_1.updateState);
router.patch('/states/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleStateStatusSchema), state_controller_1.toggleStateStatus);
// Cities CRUD
router.get('/cities', authenticate_1.default, city_controller_1.getCities);
router.post('/cities', authenticate_1.default, (0, validate_1.validate)(schemas_1.createCitySchema), city_controller_1.createCity);
router.put('/cities/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateCitySchema), city_controller_1.updateCity);
router.patch('/cities/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleCityStatusSchema), city_controller_1.toggleCityStatus);
// Subscription Plans CRUD
router.get('/subscription-plans', authenticate_1.default, subscriptionPlan_controller_1.getSubscriptionPlans);
router.post('/subscription-plans', authenticate_1.default, (0, validate_1.validate)(schemas_1.createSubscriptionPlanSchema), subscriptionPlan_controller_1.createSubscriptionPlan);
router.put('/subscription-plans/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateSubscriptionPlanSchema), subscriptionPlan_controller_1.updateSubscriptionPlan);
router.patch('/subscription-plans/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleSubscriptionPlanStatusSchema), subscriptionPlan_controller_1.toggleSubscriptionPlanStatus);
// Features CRUD
router.get('/features', authenticate_1.default, feature_controller_1.getFeatures);
router.post('/features', authenticate_1.default, (0, validate_1.validate)(schemas_1.createFeatureSchema), feature_controller_1.createFeature);
router.put('/features/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateFeatureSchema), feature_controller_1.updateFeature);
router.patch('/features/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleFeatureStatusSchema), feature_controller_1.toggleFeatureStatus);
// Roles CRUD
router.get('/roles', authenticate_1.default, role_controller_1.getRoles);
router.post('/roles', authenticate_1.default, (0, validate_1.validate)(schemas_1.createRoleSchema), role_controller_1.createRole);
router.put('/roles/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateRoleSchema), role_controller_1.updateRole);
router.patch('/roles/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleRoleStatusSchema), role_controller_1.toggleRoleStatus);
router.get('/roles/:roleId/permissions', authenticate_1.default, roleFeature_controller_1.getRolePermissions);
router.post('/roles/:roleId/permissions', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateRolePermissionsSchema), roleFeature_controller_1.updateRolePermissions);
// Company Categories CRUD
router.get('/company-categories', authenticate_1.default, companyCategory_controller_1.getCompanyCategories);
router.post('/company-categories', authenticate_1.default, (0, validate_1.validate)(schemas_1.createCompanyCategorySchema), companyCategory_controller_1.createCompanyCategory);
router.put('/company-categories/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateCompanyCategorySchema), companyCategory_controller_1.updateCompanyCategory);
router.patch('/company-categories/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleCompanyCategoryStatusSchema), companyCategory_controller_1.toggleCompanyCategoryStatus);
// Companies CRUD
router.get('/companies', authenticate_1.default, company_controller_1.getCompanies);
router.post('/companies', authenticate_1.default, (0, validate_1.validate)(schemas_1.createCompanySchema), company_controller_1.createCompany);
router.put('/companies/:id', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateCompanySchema), company_controller_1.updateCompany);
router.patch('/companies/:id/status', authenticate_1.default, (0, validate_1.validate)(schemas_1.toggleCompanyStatusSchema), company_controller_1.toggleCompanyStatus);
router.post('/companies/:id/send-verification', authenticate_1.default, company_controller_1.sendCompanyVerification);
router.post('/companies/:id/verify-email', authenticate_1.default, (0, validate_1.validate)(schemas_1.verifyCompanyEmailSchema), company_controller_1.verifyCompanyEmail);
router.get('/companies/:companyId/features', authenticate_1.default, companyFeature_controller_1.getCompanyFeatures);
router.post('/companies/:companyId/features', authenticate_1.default, (0, validate_1.validate)(schemas_1.updateCompanyFeaturesSchema), companyFeature_controller_1.updateCompanyFeatures);
exports.default = router;
