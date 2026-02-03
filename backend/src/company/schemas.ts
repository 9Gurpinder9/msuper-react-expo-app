import Joi from 'joi';

export const createBookmarkSchema = Joi.object({
  title: Joi.string().min(1).required(),
  url: Joi.string().uri().required(),
  description: Joi.string().allow('', null),
  category_id: Joi.string().uuid().allow('', null),
  tags: Joi.array().items(Joi.string().min(1)).default([]),
  is_favorite: Joi.boolean().default(false),
  thumbnail_url: Joi.string().uri().allow('', null),
  favicon_url: Joi.string().uri().allow('', null),
  og_title: Joi.string().allow('', null),
  og_description: Joi.string().allow('', null),
  og_image: Joi.string().uri().allow('', null),
});

export const updateBookmarkSchema = Joi.object({
  title: Joi.string().min(1).optional(),
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
