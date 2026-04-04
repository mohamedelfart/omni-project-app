"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMobileEnv = exports.parseWebEnv = exports.parseApiEnv = void 0;
const zod_1 = require("zod");
__exportStar(require("./markets"), exports);
const baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
});
const apiEnvSchema = baseEnvSchema.extend({
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16),
    JWT_ACCESS_TTL: zod_1.z.string(),
    JWT_REFRESH_TTL: zod_1.z.string(),
    OTP_PROVIDER: zod_1.z.string().default('mock'),
    OTP_TTL_SECONDS: zod_1.z.coerce.number().default(300),
    PASSWORD_RESET_TTL_MINUTES: zod_1.z.coerce.number().default(30),
    ACCOUNT_VERIFICATION_TTL_HOURS: zod_1.z.coerce.number().default(24),
    API_PORT: zod_1.z.coerce.number().default(4000),
    API_PREFIX: zod_1.z.string().default('api/v1'),
    APP_BASE_URL: zod_1.z.string().url(),
    WS_PORT: zod_1.z.coerce.number().default(4001),
    GOOGLE_MAPS_API_KEY: zod_1.z.string().min(1),
    GOOGLE_MAPS_REGION: zod_1.z.string().default('QA'),
    STORAGE_PROVIDER: zod_1.z.string().default('s3'),
    STORAGE_BUCKET: zod_1.z.string().min(1),
    STORAGE_REGION: zod_1.z.string().min(1),
    PAYMENT_PROVIDER: zod_1.z.string().default('stripe'),
    PAYMENT_WEBHOOK_SECRET: zod_1.z.string().min(8),
});
const webEnvSchema = baseEnvSchema.extend({
    NEXT_PUBLIC_API_BASE_URL: zod_1.z.string().url(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: zod_1.z.string().min(1),
});
const mobileEnvSchema = baseEnvSchema.extend({
    EXPO_PUBLIC_API_BASE_URL: zod_1.z.string().url(),
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: zod_1.z.string().min(1),
    EXPO_PUBLIC_WS_URL: zod_1.z.string().url(),
});
const parseApiEnv = (env) => apiEnvSchema.parse(env);
exports.parseApiEnv = parseApiEnv;
const parseWebEnv = (env) => webEnvSchema.parse(env);
exports.parseWebEnv = parseWebEnv;
const parseMobileEnv = (env) => mobileEnvSchema.parse(env);
exports.parseMobileEnv = parseMobileEnv;
