const { z } = require('zod');

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
});

function validateEnv(env) {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing required environment variables: ${missing}`);
  }
  return result.data;
}

module.exports = { validateEnv };
