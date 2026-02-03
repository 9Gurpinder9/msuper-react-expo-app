import { RequestHandler } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

let warned = false;

const appSecretGuard: RequestHandler = (req, res, next): void => {
  const expected = config.appSecret;
  if (!expected) {
    if (!warned) {
      warned = true;
      logger.warn('APP_SECRET not set. Company endpoints are not protected.');
    }
    next();
    return;
  }

  const provided = req.header('x-app-secret');
  if (!provided || provided !== expected) {
    res.status(401).json({ success: false, message: 'Unauthorized: invalid app secret.' });
    return;
  }
  next();
};

export default appSecretGuard;
