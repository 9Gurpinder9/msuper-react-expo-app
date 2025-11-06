import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import superAdminRouter from './super-admin/routes';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { apiRateLimiter } from './middleware/rateLimit';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(apiRateLimiter);

// Health & readiness
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.json({ ready: true }));

// Mount the Super Admin API
app.use('/super-admin', superAdminRouter);

// (When you add Company, you'll do the same:)
// import companyRouter from './company/routes';
// app.use('/company', companyRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;