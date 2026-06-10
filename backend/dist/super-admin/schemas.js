"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCompanyEmailSchema = exports.updateCompanyFeaturesSchema = exports.toggleCompanyStatusSchema = exports.updateCompanySchema = exports.createCompanySchema = exports.toggleCompanyCategoryStatusSchema = exports.updateCompanyCategorySchema = exports.createCompanyCategorySchema = exports.updateRolePermissionsSchema = exports.toggleRoleStatusSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.toggleFeatureStatusSchema = exports.updateFeatureSchema = exports.createFeatureSchema = exports.toggleSubscriptionPlanStatusSchema = exports.updateSubscriptionPlanSchema = exports.createSubscriptionPlanSchema = exports.toggleCityStatusSchema = exports.updateCitySchema = exports.createCitySchema = exports.toggleStateStatusSchema = exports.updateStateSchema = exports.createStateSchema = exports.toggleCountryStatusSchema = exports.updateCountrySchema = exports.createCountrySchema = exports.onlineScanBillSchema = exports.resetPasswordConfirmSchema = exports.resetPasswordVerifyOtpSchema = exports.resetPasswordRequestSchema = exports.verifyOtpSchema = exports.emailOnlySchema = exports.loginSchema = void 0;
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
exports.createCountrySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    code: joi_1.default.string().trim().uppercase().min(2).max(10).required().messages({
        'string.empty': 'Code is required.',
        'string.min': 'Code must be at least 2 characters.',
    }),
    phone_code: joi_1.default.string().trim().min(1).max(10).optional().allow('', null),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateCountrySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required(),
    code: joi_1.default.string().trim().uppercase().min(2).max(10).required(),
    phone_code: joi_1.default.string().trim().min(1).max(10).optional().allow('', null),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleCountryStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
// States validation schemas
exports.createStateSchema = joi_1.default.object({
    country_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'Country selection is required.',
    }),
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    code: joi_1.default.string().trim().uppercase().min(2).max(10).required().messages({
        'string.empty': 'Code is required.',
        'string.min': 'Code must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateStateSchema = joi_1.default.object({
    country_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'Country selection is required.',
    }),
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    code: joi_1.default.string().trim().uppercase().min(2).max(10).required().messages({
        'string.empty': 'Code is required.',
        'string.min': 'Code must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleStateStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
// Cities validation schemas
exports.createCitySchema = joi_1.default.object({
    state_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'State selection is required.',
    }),
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateCitySchema = joi_1.default.object({
    state_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'State selection is required.',
    }),
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleCityStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
// Subscription Plans validation schemas
exports.createSubscriptionPlanSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    description: joi_1.default.string().trim().allow('', null).optional(),
    price: joi_1.default.number().precision(2).required().when('name', {
        is: joi_1.default.string().regex(/^free$/i),
        then: joi_1.default.number().min(0),
        otherwise: joi_1.default.number().min(1000).messages({
            'number.min': 'Price must be at least 1000 for non-Free plans.',
        }),
    }).messages({
        'any.required': 'Price is required.',
    }),
    amc_price: joi_1.default.number().precision(2).required().when('name', {
        is: joi_1.default.string().regex(/^free$/i),
        then: joi_1.default.number().min(0),
        otherwise: joi_1.default.number().min(1000).messages({
            'number.min': 'AMC Price must be at least 1000 for non-Free plans.',
        }),
    }).messages({
        'any.required': 'AMC Price is required.',
    }),
    duration_days: joi_1.default.number().integer().min(7).max(365).required().messages({
        'number.min': 'Duration must be at least 7 days.',
        'number.max': 'Duration cannot exceed 365 days.',
        'any.required': 'Duration is required.',
    }),
    is_active: joi_1.default.boolean().default(true),
}).custom((value, helpers) => {
    const isFree = value.name && value.name.toLowerCase() === 'free';
    if (!isFree && value.price <= value.amc_price) {
        return helpers.message({ custom: 'Price must be strictly greater than AMC Price' });
    }
    return value;
});
exports.updateSubscriptionPlanSchema = exports.createSubscriptionPlanSchema;
exports.toggleSubscriptionPlanStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
exports.createFeatureSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    display_name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Display Name is required.',
        'string.min': 'Display Name must be at least 2 characters.',
    }),
    description: joi_1.default.string().trim().optional().allow('', null),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateFeatureSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required(),
    display_name: joi_1.default.string().trim().min(2).max(100).required(),
    description: joi_1.default.string().trim().optional().allow('', null),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleFeatureStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
exports.createRoleSchema = joi_1.default.object({
    name: joi_1.default.string().trim().uppercase().min(2).max(100).required().messages({
        'string.empty': 'Role Name is required.',
        'string.min': 'Role Name must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateRoleSchema = joi_1.default.object({
    name: joi_1.default.string().trim().uppercase().min(2).max(100).required(),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleRoleStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
exports.updateRolePermissionsSchema = joi_1.default.object({
    permissions: joi_1.default.array().items(joi_1.default.object({
        feature_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required(),
        actions: joi_1.default.array().items(joi_1.default.string()).required(),
    })).required(),
});
// Company Categories validation schemas
exports.createCompanyCategorySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
    }),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateCompanyCategorySchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(2).max(100).required(),
    is_active: joi_1.default.boolean().optional(),
});
exports.toggleCompanyCategoryStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
// Companies validation schemas
exports.createCompanySchema = joi_1.default.object({
    owner_name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Owner Name is required.',
    }),
    name: joi_1.default.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Company Name is required.',
    }),
    email: joi_1.default.string().trim().lowercase().email().required().messages({
        'string.empty': 'Email is required.',
        'string.email': 'Email must be valid.',
    }),
    mobile1: joi_1.default.string().trim().min(7).max(15).required().messages({
        'string.empty': 'Mobile 1 is required.',
    }),
    mobile2: joi_1.default.string().trim().max(15).optional().allow('', null),
    country_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'Country selection is required.',
    }),
    country_name: joi_1.default.string().trim().required().messages({
        'string.empty': 'Country Name is required.',
    }),
    state_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'State selection is required.',
    }),
    state_name: joi_1.default.string().trim().required().messages({
        'string.empty': 'State Name is required.',
    }),
    city_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'City selection is required.',
    }),
    city_name: joi_1.default.string().trim().required().messages({
        'string.empty': 'City Name is required.',
    }),
    category_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'Category selection is required.',
    }),
    category_name: joi_1.default.string().trim().required().messages({
        'string.empty': 'Category Name is required.',
    }),
    plan_id: joi_1.default.alternatives().try(joi_1.default.number(), joi_1.default.string()).required().messages({
        'any.required': 'Subscription Plan selection is required.',
    }),
    gst_no: joi_1.default.string().trim().max(20).optional().allow('', null),
    address1: joi_1.default.string().trim().max(255).optional().allow('', null),
    address2: joi_1.default.string().trim().max(255).optional().allow('', null),
    print_name: joi_1.default.string().trim().max(100).optional().allow('', null),
    validity_date: joi_1.default.date().iso().required().messages({
        'any.required': 'Validity Date is required.',
    }),
    expiry_date: joi_1.default.date().iso().min(joi_1.default.ref('validity_date')).required().messages({
        'any.required': 'Expiry Date is required.',
        'date.min': 'Expiry Date must be after or equal to Validity Date.',
    }),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateCompanySchema = exports.createCompanySchema.keys({
    password: joi_1.default.string()
        .trim()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .optional()
        .allow('', null)
        .messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }),
    confirm_password: joi_1.default.any()
        .valid(joi_1.default.ref('password'))
        .optional()
        .messages({
        'any.only': 'Passwords do not match.',
    }),
});
exports.toggleCompanyStatusSchema = joi_1.default.object({
    is_active: joi_1.default.boolean().required(),
});
exports.updateCompanyFeaturesSchema = joi_1.default.object({
    feature_ids: joi_1.default.array().items(joi_1.default.number().integer()).required().messages({
        'array.base': 'Features must be a list of feature IDs.',
        'any.required': 'Features list is required.',
    }),
});
exports.verifyCompanyEmailSchema = joi_1.default.object({
    otp: joi_1.default.string().trim().length(6).required().messages({
        'string.empty': 'OTP is required.',
        'string.length': 'OTP must be exactly 6 characters.',
    }),
});
