import { z } from 'zod';

// Schema for publicly exposed environment variables (client-side)
const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_SERVICE_ID: z.string().optional(),
    NEXT_PUBLIC_TEMPLATE_ID: z.string().optional(),
    NEXT_PUBLIC_USER_ID: z.string().optional(),
    NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
    NEXT_PUBLIC_SHOW_BETA: z.string().optional(),
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(['development', 'preview', 'production'])
      .optional(),
    NEXT_PUBLIC_STATIC_EXPORT: z.enum(['true', 'false']).optional(),
  })
  .passthrough();

export function validatePublicEnv(env: Record<string, unknown>) {
  publicEnvSchema.parse(env);
}
