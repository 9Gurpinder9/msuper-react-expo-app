// src/server.ts
import dotenv from 'dotenv';
import { connectRedis } from './database/redisClient';
dotenv.config();

import app from './app';
import { config } from './config';

const PORT = config.port || 4000;

(async () => {
  try {
    await connectRedis();
  } catch (err: any) {
    console.warn('Redis unavailable, starting server anyway:', err?.message || err);
  }

  app
    .listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    })
    .on('error', (err) => {
      console.error('Server failed to start:', err);
    });
})();
