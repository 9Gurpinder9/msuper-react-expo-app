import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().positive().default(4000),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().min(10).required(),
  DOCUMENTAI_PROJECT_ID: Joi.string().optional(),
  DOCUMENTAI_LOCATION: Joi.string().valid('us', 'eu').optional(),
  DOCUMENTAI_PROCESSOR_ID: Joi.string().optional(),
  DOCUMENTAI_SA_KEY: Joi.string().optional(),
  HCAPTCHA_SECRET: Joi.string().min(10).optional(),
  HCAPTCHA_ENABLED: Joi.string().valid('true', 'false').default('true'),
  APP_SECRET: Joi.string().min(8).optional(),
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
  documentAiProjectId: value.DOCUMENTAI_PROJECT_ID as string | undefined,
  documentAiLocation: value.DOCUMENTAI_LOCATION as 'us' | 'eu' | undefined,
  documentAiProcessorId: value.DOCUMENTAI_PROCESSOR_ID as string | undefined,
  documentAiServiceAccountKey: value.DOCUMENTAI_SA_KEY as string | undefined,
  hcaptchaSecret: value.HCAPTCHA_SECRET as string | undefined,
  hcaptchaEnabled: String(value.HCAPTCHA_ENABLED).toLowerCase() !== 'false',
  appSecret: value.APP_SECRET as string | undefined,
};

