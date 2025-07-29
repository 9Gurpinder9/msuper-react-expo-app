import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import superAdminRouter from './super-admin/routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount the Super‑Admin API
app.use('/super-admin', superAdminRouter);

// (When you add Company, you’ll do the same:)
// import companyRouter from './company/routes';
// app.use('/company', companyRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
