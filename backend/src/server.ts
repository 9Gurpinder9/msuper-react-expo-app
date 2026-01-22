// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config';

const PORT = config.port || 4000;

app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on('error', (err) => {
    console.error('Server failed to start:', err);
  });
