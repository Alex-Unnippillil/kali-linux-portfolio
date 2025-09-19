const { z, ZodError } = require('zod');

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
  RECAPTCHA_SECRET: z.string().min(1, 'RECAPTCHA_SECRET is required'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

function formatServerEnvIssues(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('\n  - ');
}

function isCiEnv(env) {
  const value = env.CI;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
}

function validatePublicEnv(env) {
  return publicEnvSchema.parse(env);
}

function validateServerEnv(env) {
  return serverEnvSchema.parse(env);
}

function assertServerEnv(env, { fatalOnError = isCiEnv(env), logger = console } = {}) {
  try {
    validateServerEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = `Invalid environment configuration:\n  - ${formatServerEnvIssues(error)}`;
      if (fatalOnError) {
        throw new Error(message);
      }
      logger?.warn?.(message);
      return;
    }
    throw error;
  }
}

module.exports = {
  assertServerEnv,
  formatServerEnvIssues,
  validatePublicEnv,
  validateServerEnv,
};
