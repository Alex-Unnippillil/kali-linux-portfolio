import { z } from 'zod';

const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
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
  NEXT_PUBLIC_STATIC_EXPORT: z.string().optional(),
  NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
  NEXT_PUBLIC_SHOW_BETA: z.string().optional(),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;

function readClientEnv(): ClientEnv {
  return clientEnvSchema.parse(process.env);
}

function createEnvProxy<T extends Record<string, unknown>>(reader: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      if (prop === Symbol.toStringTag) {
        return 'RuntimeEnv';
      }
      if (typeof prop !== 'string') {
        return undefined;
      }
      const env = reader();
      return env[prop as keyof T];
    },
    ownKeys() {
      return Reflect.ownKeys(reader());
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      const env = reader();
      if (!(prop in env)) {
        return undefined;
      }
      const value = env[prop as keyof T];
      if (typeof value === 'undefined') {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        value,
        writable: false,
      };
    },
  });
}

export function getClientEnv(): ClientEnv {
  return readClientEnv();
}

export function validateClientEnv(env: NodeJS.ProcessEnv): ClientEnv {
  return clientEnvSchema.parse(env);
}

export const clientEnv = createEnvProxy<ClientEnv>(readClientEnv);

export type { ClientEnv };
export { clientEnvSchema };
