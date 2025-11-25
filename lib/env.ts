import { z } from 'zod';

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function booleanFlag(defaultValue = false) {
  return z
    .preprocess((value) => {
      if (typeof value === 'boolean') {
        return value;
      }

      const normalized = normalizeString(value);
      if (typeof normalized === 'string') {
        const lowered = normalized.toLowerCase();
        if (TRUE_VALUES.has(lowered)) return true;
        if (FALSE_VALUES.has(lowered)) return false;
      }

      return normalized;
    }, z.boolean().optional())
    .transform((value) => value ?? defaultValue);
}

function optionalString() {
  return z.preprocess(normalizeString, z.string().min(1).optional());
}

function optionalUrl() {
  return z.preprocess(normalizeString, z.string().url().optional());
}

function featureToggle(defaultValue: 'enabled' | 'disabled' = 'disabled') {
  return z
    .preprocess((value) => {
      const normalized = normalizeString(value);
      if (typeof normalized === 'string') {
        return normalized.toLowerCase();
      }

      return normalized;
    }, z.enum(['enabled', 'disabled']).optional())
    .transform((value) => value ?? defaultValue);
}

export const publicEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFlag(false),
    NEXT_PUBLIC_VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: optionalString(),
    NEXT_PUBLIC_TRACKING_ID: optionalString(),
    NEXT_PUBLIC_USER_ID: optionalString(),
    NEXT_PUBLIC_SERVICE_ID: optionalString(),
    NEXT_PUBLIC_TEMPLATE_ID: optionalString(),
    NEXT_PUBLIC_YOUTUBE_API_KEY: optionalString(),
    NEXT_PUBLIC_CURRENCY_API_URL: optionalUrl(),
    NEXT_PUBLIC_DEMO_MODE: booleanFlag(false),
    NEXT_PUBLIC_UI_EXPERIMENTS: booleanFlag(false),
    NEXT_PUBLIC_STATIC_EXPORT: booleanFlag(false),
    NEXT_PUBLIC_SHOW_BETA: booleanFlag(false),
    NEXT_PUBLIC_GHIDRA_WASM: optionalString(),
    NEXT_PUBLIC_GHIDRA_URL: optionalUrl(),
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(),
    NEXT_PUBLIC_BASE_PATH: optionalString(),
    NEXT_PUBLIC_BUILD_ID: optionalString(),
  })
  .passthrough();

export const serverEnvSchema = publicEnvSchema
  .extend({
    FEATURE_TOOL_APIS: featureToggle('disabled'),
    FEATURE_HYDRA: featureToggle('disabled'),
    RECAPTCHA_SECRET: optionalString(),
    ADMIN_READ_KEY: optionalString(),
    SUPABASE_URL: optionalUrl(),
    SUPABASE_SERVICE_ROLE_KEY: optionalString(),
    SUPABASE_ANON_KEY: optionalString(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.RECAPTCHA_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RECAPTCHA_SECRET'],
        message:
          'RECAPTCHA_SECRET is required in production. Configure it via your hosting provider rather than local files.',
      });
    }

    if (env.SUPABASE_URL && !env.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'SUPABASE_SERVICE_ROLE_KEY must be provided when SUPABASE_URL is set.',
      });
    }

    if (env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'SUPABASE_URL must be provided when SUPABASE_SERVICE_ROLE_KEY is set.',
      });
    }

    if (env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided when NEXT_PUBLIC_SUPABASE_URL is set.',
      });
    }

    if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.NEXT_PUBLIC_SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_SUPABASE_URL'],
        message: 'NEXT_PUBLIC_SUPABASE_URL must be provided when NEXT_PUBLIC_SUPABASE_ANON_KEY is set.',
      });
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadPublicEnv(env: NodeJS.ProcessEnv = process.env): PublicEnv {
  return publicEnvSchema.parse(env);
}

export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}

export const validatePublicEnv = loadPublicEnv;
export const validateServerEnv = loadServerEnv;
