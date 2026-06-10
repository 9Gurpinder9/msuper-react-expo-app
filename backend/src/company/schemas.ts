import Joi from 'joi';

export const createBookmarkSchema = Joi.object({
  title: Joi.string().min(1).required(),
  url: Joi.string().uri().required(),
  description: Joi.string().allow('', null),
  category_id: Joi.string().uuid().required(),
  tags: Joi.array().items(Joi.string().min(1)).default([]),
  is_favorite: Joi.boolean().default(false),
  thumbnail_url: Joi.string().uri().allow('', null),
  favicon_url: Joi.string().uri().allow('', null),
  og_title: Joi.string().allow('', null),
  og_description: Joi.string().allow('', null),
  og_image: Joi.string().uri().allow('', null),
});

export const updateBookmarkSchema = Joi.object({
  title: Joi.string().allow('', null).optional(),
  url: Joi.string().uri().optional(),
  description: Joi.string().allow('', null),
  category_id: Joi.string().uuid().allow('', null),
  tags: Joi.array().items(Joi.string().min(1)).optional(),
  is_favorite: Joi.boolean().optional(),
  thumbnail_url: Joi.string().uri().allow('', null),
  favicon_url: Joi.string().uri().allow('', null),
  og_title: Joi.string().allow('', null),
  og_description: Joi.string().allow('', null),
  og_image: Joi.string().uri().allow('', null),
});

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
});

export const companyLoginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
  captchaToken: Joi.string().allow('', null).optional(),
});

export const companyVerifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string().length(6).required(),
  rememberMe: Joi.boolean().optional().default(false),
});

export const companyEmailOnlySchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

export const companyResetPasswordVerifyOtpSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  otp: Joi.string().length(6).required(),
});

export const companyResetPasswordConfirmSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  resetToken: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

