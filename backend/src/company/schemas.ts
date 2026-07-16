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
export const updateCompanyProfileSchema = Joi.object({
  mobile2: Joi.string().allow('', null).max(15).optional(),
  gst_no: Joi.string().allow('', null).max(15).optional(),
  print_name: Joi.string().allow('', null).max(100).optional(),
});

export const punchInSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  photo: Joi.string().required(), // expect base64 string or image data string
  locationAddress: Joi.string().allow('', null).optional(),
});

export const punchOutSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  photo: Joi.string().required(), // expect base64 string or image data string
  locationAddress: Joi.string().allow('', null).optional(),
});

export const companyCreateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({ 'string.empty': 'Name is required.' }),
  email: Joi.string().trim().lowercase().email().required().messages({ 'string.empty': 'Email is required.', 'string.email': 'Valid email is required.' }),
  password: Joi.string().trim().min(8).required().messages({ 'string.empty': 'Password is required.', 'string.min': 'Password must be at least 8 characters.' }),
  mobile: Joi.string().trim().min(7).max(15).required().messages({ 'string.empty': 'Mobile number is required.' }),
  country_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'Country is required.' }),
  country_name: Joi.string().trim().required().messages({ 'string.empty': 'Country Name is required.' }),
  state_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'State is required.' }),
  state_name: Joi.string().trim().required().messages({ 'string.empty': 'State Name is required.' }),
  city_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'City is required.' }),
  city_name: Joi.string().trim().required().messages({ 'string.empty': 'City Name is required.' }),
  address: Joi.string().trim().max(255).required().messages({ 'string.empty': 'Address is required.' }),
  role_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'Role is required.' }),
});

export const companyUpdateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({ 'string.empty': 'Name is required.' }),
  email: Joi.string().trim().lowercase().email().required().messages({ 'string.empty': 'Email is required.', 'string.email': 'Valid email is required.' }),
  password: Joi.string().trim().min(8).optional().allow('', null).messages({ 'string.min': 'Password must be at least 8 characters.' }),
  mobile: Joi.string().trim().min(7).max(15).required().messages({ 'string.empty': 'Mobile number is required.' }),
  country_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'Country is required.' }),
  country_name: Joi.string().trim().required().messages({ 'string.empty': 'Country Name is required.' }),
  state_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'State is required.' }),
  state_name: Joi.string().trim().required().messages({ 'string.empty': 'State Name is required.' }),
  city_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'City is required.' }),
  city_name: Joi.string().trim().required().messages({ 'string.empty': 'City Name is required.' }),
  address: Joi.string().trim().max(255).required().messages({ 'string.empty': 'Address is required.' }),
  role_id: Joi.alternatives().try(Joi.number(), Joi.string()).required().messages({ 'any.required': 'Role is required.' }),
});

export const toggleUserStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

export const verifyUserEmailSchema = Joi.object({
  otp: Joi.string().trim().length(6).required().messages({ 'string.empty': 'OTP is required.', 'string.length': 'OTP must be exactly 6 characters.' }),
});

