import { z } from 'zod';

import { clientEnvSchema, type ClientEnv } from './env.client';

const serverOnlyEnvSchema = z.object({
  ADMIN_READ_KEY: z.string().optional(),
  ANALYZE: z.string().optional(),
  BASE_URL: z.string().optional(),
  FEATURE_HYDRA: z.string().optional(),
  FEATURE_TOOL_APIS: z.string().optional(),
  RECAPTCHA_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SMOKE_LOG: z.string().optional(),
});

const serverEnvSchema = clientEnvSchema.merge(serverOnlyEnvSchema);

const validatedServerEnvSchema = serverEnvSchema.extend({
  RECAPTCHA_SECRET: z.string(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ValidatedServerEnv = z.infer<typeof validatedServerEnvSchema>;

function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
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

export function getServerEnv(): ServerEnv {
  return readServerEnv();
}

export function getValidatedServerEnv(): ValidatedServerEnv {
  return validatedServerEnvSchema.parse(process.env);
}

export function validateServerEnv(env: NodeJS.ProcessEnv): ValidatedServerEnv {
  return validatedServerEnvSchema.parse(env);
}

export const serverEnv = createEnvProxy<ServerEnv>(readServerEnv);

export type { ClientEnv, ServerEnv, ValidatedServerEnv };
export { serverEnvSchema, validatedServerEnvSchema };
