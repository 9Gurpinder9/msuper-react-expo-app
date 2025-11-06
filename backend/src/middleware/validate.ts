import { RequestHandler } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.Schema): RequestHandler => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
};

