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
  imageBase64: Joi.string().trim().min(50).required().messages({
    'string.empty': 'Image is required.',
    'string.min': 'Image data is too short.',
  }),
  mimeType: Joi.string().trim().optional(),
});

