import Joi from 'joi';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email must be valid.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 6 characters long.',
    'any.required': 'Password is required.',
  }),
  captchaToken: Joi.string().trim().min(10).optional().messages({
    'string.empty': 'Captcha is required.',
    'string.min': 'Captcha is invalid.',
  }),
});

export const emailOnlySchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email must be valid.',
    'any.required': 'Email is required.',
  }),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  otp: Joi.string().trim().required(),
});

export const resetPasswordRequestSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Email must be valid.',
    'any.required': 'Email is required.',
  }),
});

export const resetPasswordVerifyOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  otp: Joi.string().trim().required(),
});

export const resetPasswordConfirmSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  resetToken: Joi.string().trim().required(),
  newPassword: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base':
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
      'string.empty': 'Password is required.',
      'any.required': 'Password is required.',
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({ 'any.only': 'Passwords do not match.' }),
});

export const onlineScanBillSchema = Joi.object({
  imageBase64: Joi.string().trim().min(50).messages({
    'string.empty': 'File is required.',
    'string.min': 'File data is too short.',
  }),
  mimeType: Joi.string().trim().optional(),
  files: Joi.array()
    .items(
      Joi.object({
        imageBase64: Joi.string().trim().min(50).required().messages({
          'string.empty': 'File is required.',
          'string.min': 'File data is too short.',
        }),
        mimeType: Joi.string().trim().optional(),
      })
    )
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

export const createCountrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  code: Joi.string().trim().uppercase().min(2).max(10).required().messages({
    'string.empty': 'Code is required.',
    'string.min': 'Code must be at least 2 characters.',
  }),
  phone_code: Joi.string().trim().min(1).max(10).optional().allow('', null),
  is_active: Joi.boolean().default(true),
});

export const updateCountrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  code: Joi.string().trim().uppercase().min(2).max(10).required(),
  phone_code: Joi.string().trim().min(1).max(10).optional().allow('', null),
  is_active: Joi.boolean().optional(),
});

export const toggleCountryStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

// States validation schemas
export const createStateSchema = Joi.object({
  country_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({
    'any.required': 'Country selection is required.',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  code: Joi.string().trim().uppercase().min(2).max(10).required().messages({
    'string.empty': 'Code is required.',
    'string.min': 'Code must be at least 2 characters.',
  }),
  is_active: Joi.boolean().default(true),
});

export const updateStateSchema = Joi.object({
  country_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({
    'any.required': 'Country selection is required.',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  code: Joi.string().trim().uppercase().min(2).max(10).required().messages({
    'string.empty': 'Code is required.',
    'string.min': 'Code must be at least 2 characters.',
  }),
  is_active: Joi.boolean().optional(),
});

export const toggleStateStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

// Cities validation schemas
export const createCitySchema = Joi.object({
  state_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({
    'any.required': 'State selection is required.',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  is_active: Joi.boolean().default(true),
});

export const updateCitySchema = Joi.object({
  state_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({
    'any.required': 'State selection is required.',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  is_active: Joi.boolean().optional(),
});

export const toggleCityStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

// Subscription Plans validation schemas
export const createSubscriptionPlanSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  description: Joi.string().trim().allow('', null).optional(),
  price: Joi.number().precision(2).required().when('name', {
    is: Joi.string().regex(/^free$/i),
    then: Joi.number().min(0),
    otherwise: Joi.number().min(1000).messages({
      'number.min': 'Price must be at least 1000 for non-Free plans.',
    }),
  }).messages({
    'any.required': 'Price is required.',
  }),
  amc_price: Joi.number().precision(2).required().when('name', {
    is: Joi.string().regex(/^free$/i),
    then: Joi.number().min(0),
    otherwise: Joi.number().min(1000).messages({
      'number.min': 'AMC Price must be at least 1000 for non-Free plans.',
    }),
  }).messages({
    'any.required': 'AMC Price is required.',
  }),
  duration_days: Joi.number().integer().min(7).max(365).required().messages({
    'number.min': 'Duration must be at least 7 days.',
    'number.max': 'Duration cannot exceed 365 days.',
    'any.required': 'Duration is required.',
  }),
  is_active: Joi.boolean().default(true),
}).custom((value, helpers) => {
  const isFree = value.name && value.name.toLowerCase() === 'free';
  if (!isFree && value.price <= value.amc_price) {
    return helpers.message({ custom: 'Price must be strictly greater than AMC Price' });
  }
  return value;
});

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema;

export const toggleSubscriptionPlanStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

export const createFeatureSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters.',
  }),
  display_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Display Name is required.',
    'string.min': 'Display Name must be at least 2 characters.',
  }),
  description: Joi.string().trim().optional().allow('', null),
  is_active: Joi.boolean().default(true),
});

export const updateFeatureSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  display_name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().optional().allow('', null),
  is_active: Joi.boolean().optional(),
});

export const toggleFeatureStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

export const createRoleSchema = Joi.object({
  name: Joi.string().trim().uppercase().min(2).max(100).required().messages({
    'string.empty': 'Role Name is required.',
    'string.min': 'Role Name must be at least 2 characters.',
  }),
  is_active: Joi.boolean().default(true),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().trim().uppercase().min(2).max(100).required(),
  is_active: Joi.boolean().optional(),
});

export const toggleRoleStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

export const updateRolePermissionsSchema = Joi.object({
  permissions: Joi.array().items(
    Joi.object({
      feature_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
      actions: Joi.array().items(Joi.string()).required(),
    })
  ).required(),
});



