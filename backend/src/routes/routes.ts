// src/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import supabase from '../database/supabaseClient';
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

/**
 * A small router to hit your Supabase instance
 */
export const testSupabaseRouter = Router();
testSupabaseRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('test_data')
      .select('*')
      .limit(1);

    if (error) throw error;
    logger.info('Fetched test_data from Supabase');
    res.json({ success: true, data });
  } catch (err: any) {
    logger.error(`[Supabase Error] ${err.message}`);
    next(err);
  }
});
