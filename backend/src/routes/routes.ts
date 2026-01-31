// src/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { checkSupabaseConnection } from '../database/testConnection';
import logger from '../utils/logger';

/**
 * A simple liveness / health‑check endpoint
 */
export const healthRouter = Router();
healthRouter.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Removed legacy: testSupabaseRouter (use testDatabaseRouter instead)

/**
 * Test database connectivity via Supabase
 * GET /test-database
 * Returns whether Supabase is reachable and if a trivial query succeeded
 */
export const testDatabaseRouter = Router();
testDatabaseRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await checkSupabaseConnection();

    if (result.ok) {
      return res.json({
        connected: true,
        querySucceeded: true,
        rows: result.rows ?? 0,
        status: result.status ?? 200,
        timestamp: new Date().toISOString()
      });
    }

    if (result.reachable) {
      // Supabase reachable but query failed (e.g., table missing/permissions)
      logger.warn(`Supabase reachable but query failed: ${result.error?.message}`);
      return res.json({
        connected: true,
        querySucceeded: false,
        error: result.error,
        status: result.status ?? 200,
        timestamp: new Date().toISOString()
      });
    }

    // Not reachable at all
    return res.status(503).json({
      connected: false,
      querySucceeded: false,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    logger.error(`[Test-Database Error] ${err?.message || err}`);
    next(err);
  }
});
