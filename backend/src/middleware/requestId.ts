import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

export const requestId: RequestHandler = (req, _res, next) => {
  const header = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = header;
  next();
};

