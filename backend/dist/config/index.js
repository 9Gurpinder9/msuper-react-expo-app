"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const joi_1 = __importDefault(require("joi"));
const envSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('development', 'test', 'production').default('development'),
    PORT: joi_1.default.number().integer().positive().default(4000),
    SUPABASE_URL: joi_1.default.string().uri().required(),
    SUPABASE_SERVICE_ROLE_KEY: joi_1.default.string().min(10).required(),
    DOCUMENTAI_PROJECT_ID: joi_1.default.string().optional(),
    DOCUMENTAI_LOCATION: joi_1.default.string().valid('us', 'eu').optional(),
    DOCUMENTAI_PROCESSOR_ID: joi_1.default.string().optional(),
    DOCUMENTAI_SA_KEY: joi_1.default.string().optional(),
    HCAPTCHA_SECRET: joi_1.default.string().min(10).optional(),
    HCAPTCHA_ENABLED: joi_1.default.string().valid('true', 'false').default('true'),
    APP_SECRET: joi_1.default.string().min(8).optional(),
}).unknown(true);
const { value, error } = envSchema.validate(process.env, { abortEarly: false });
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
exports.config = {
    nodeEnv: value.NODE_ENV,
    port: Number(value.PORT),
    supabaseUrl: value.SUPABASE_URL,
    supabaseServiceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY,
    documentAiProjectId: value.DOCUMENTAI_PROJECT_ID,
    documentAiLocation: value.DOCUMENTAI_LOCATION,
    documentAiProcessorId: value.DOCUMENTAI_PROCESSOR_ID,
    documentAiServiceAccountKey: value.DOCUMENTAI_SA_KEY,
    hcaptchaSecret: value.HCAPTCHA_SECRET,
    hcaptchaEnabled: String(value.HCAPTCHA_ENABLED).toLowerCase() !== 'false',
    appSecret: value.APP_SECRET,
};
