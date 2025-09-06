const { z } = require('zod');

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RECAPTCHA_SECRET: z.string().min(1),
  RATE_LIMIT_SECRET: z.string().min(1),
  ADMIN_READ_KEY: z.string().optional(),
});

function validateServerEnv(env) {
  serverEnvSchema.parse(env);
}

module.exports = { validateServerEnv };
