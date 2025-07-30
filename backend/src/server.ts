// src/server.ts
import dotenv from 'dotenv';
import { connectRedis } from './database/redisClient';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 4000;

(async () => {
    await connectRedis();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
        .on('error', (err) => {
            console.error('Server failed to start:', err)
        })
})();
