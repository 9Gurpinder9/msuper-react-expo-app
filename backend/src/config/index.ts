import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().positive().default(4000),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().min(10).required(),
  REDIS_URL: Joi.string().uri().optional(),
}).unknown(true);

const { value, error } = envSchema.validate(process.env, { abortEarly: false });
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  nodeEnv: value.NODE_ENV as string,
  port: Number(value.PORT),
  supabaseUrl: value.SUPABASE_URL as string,
  supabaseServiceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY as string,
  redisUrl: value.REDIS_URL as string | undefined,
};

