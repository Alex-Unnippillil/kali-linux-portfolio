const { z } = require('zod');

const publicEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_USER_ID: z.string().optional(),
  NEXT_PUBLIC_SERVICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEMPLATE_ID: z.string().optional(),
  NEXT_PUBLIC_YOUTUBE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_YOUTUBE_CHANNEL_ID: z.string().optional(),
  NEXT_PUBLIC_CURRENCY_API_URL: z.string().optional(),
  NEXT_PUBLIC_DEMO_MODE: z.string().optional(),
  NEXT_PUBLIC_UI_EXPERIMENTS: z.string().optional(),
  NEXT_PUBLIC_GHIDRA_WASM: z.string().optional(),
  NEXT_PUBLIC_GHIDRA_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  RECAPTCHA_SECRET: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  RATE_LIMIT_SECRET: z.string(),
  ADMIN_READ_KEY: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string(),
});

function validatePublicEnv(env) {
  return publicEnvSchema.parse(env);
}

function validateServerEnv(env) {
  return serverEnvSchema.parse(env);
}

module.exports = { validatePublicEnv, validateServerEnv };
