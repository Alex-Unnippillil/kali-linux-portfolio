import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
  NEXT_PUBLIC_USER_ID: z.string().optional(),
  NEXT_PUBLIC_SERVICE_ID: z.string().optional(),
  NEXT_PUBLIC_TEMPLATE_ID: z.string().optional(),
  NEXT_PUBLIC_YOUTUBE_API_KEY: z.string().optional(),
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
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export function validatePublicEnv(env: NodeJS.ProcessEnv) {
  return publicEnvSchema.parse(env);
}

export function validateServerEnv(env: NodeJS.ProcessEnv) {
  return serverEnvSchema.parse(env);
}
