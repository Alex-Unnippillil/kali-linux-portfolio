import { z } from 'zod';

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Missing required environment variables: ${missing}`);
}
