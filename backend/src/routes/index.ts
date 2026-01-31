import { Router } from 'express';
import superAdminRouter from '../super-admin/routes';
import { healthRouter, supabaseInfoRouter, testDatabaseRouter } from './routes';

// Central router: mount all feature routers here
const router = Router();

// Health and diagnostics
router.use('/healthz', healthRouter); // GET /healthz
router.use('/test-database', testDatabaseRouter); // GET /test-database
router.use('/debug/supabase', supabaseInfoRouter); // GET /debug/supabase (guarded)

// Feature routers
router.use('/super-admin', superAdminRouter);

export default router;
