import app from '../src/app';
import { connectRedis } from '../src/database/redisClient';

export default async function handler(req: any, res: any) {
  // In serverless environments, connections may close between invocations.
  // Always attempt to (re)connect; connectRedis is safe to call repeatedly.
  await connectRedis();
  return app(req, res);
}
