import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
});

export function validateEnv(env: Record<string, string | undefined>) {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing required environment variables: ${missing}`);
  }
  return result.data;
}
