import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { apiRateLimiter } from './middleware/rateLimit';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(apiRateLimiter);

// Mount all routes from a single index
app.use('/', routes);
// Error handler (must be last)
app.use(errorHandler);

export default app;
