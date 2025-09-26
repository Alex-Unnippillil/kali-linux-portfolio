import { z } from 'zod';

type NormalizedEnv = Record<string, string | undefined>;

const booleanFlag = z.enum(['true', 'false']);
const featureToggle = z.enum(['enabled', 'disabled']);

const helpText: Record<string, string> = {
  NEXT_PUBLIC_STATIC_EXPORT:
    'Set NEXT_PUBLIC_STATIC_EXPORT to "true" during static exports, otherwise "false".',
  FEATURE_TOOL_APIS:
    'FEATURE_TOOL_APIS must be either "enabled" or "disabled" to control simulated tool APIs.',
  FEATURE_HYDRA:
    'FEATURE_HYDRA must be either "enabled" or "disabled" to toggle the Hydra API route.',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    'Provide NEXT_PUBLIC_SUPABASE_ANON_KEY when NEXT_PUBLIC_SUPABASE_URL is set.',
  NEXT_PUBLIC_SUPABASE_URL:
    'Provide NEXT_PUBLIC_SUPABASE_URL when NEXT_PUBLIC_SUPABASE_ANON_KEY is set.',
  SUPABASE_SERVICE_ROLE_KEY:
    'Provide SUPABASE_SERVICE_ROLE_KEY when SUPABASE_URL is configured.',
  SUPABASE_URL:
    'Provide SUPABASE_URL when SUPABASE_SERVICE_ROLE_KEY is configured.',
};

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_STATIC_EXPORT: booleanFlag,
    FEATURE_TOOL_APIS: featureToggle,
    FEATURE_HYDRA: featureToggle,
    NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFlag.optional(),
    NEXT_PUBLIC_DEMO_MODE: booleanFlag.optional(),
    NEXT_PUBLIC_UI_EXPERIMENTS: booleanFlag.optional(),
    NEXT_PUBLIC_SHOW_BETA: z.string().optional(),
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_TRACKING_ID: z.string().optional(),
    NEXT_PUBLIC_USER_ID: z.string().optional(),
    NEXT_PUBLIC_SERVICE_ID: z.string().optional(),
    NEXT_PUBLIC_TEMPLATE_ID: z.string().optional(),
    NEXT_PUBLIC_YOUTUBE_API_KEY: z.string().optional(),
    NEXT_PUBLIC_CURRENCY_API_URL: z.string().optional(),
    NEXT_PUBLIC_GHIDRA_WASM: z.string().optional(),
    NEXT_PUBLIC_GHIDRA_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    RECAPTCHA_SECRET: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.FEATURE_HYDRA === 'enabled' && value.FEATURE_TOOL_APIS !== 'enabled') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FEATURE_TOOL_APIS'],
        message: 'FEATURE_TOOL_APIS must be "enabled" when FEATURE_HYDRA is enabled.',
      });
    }

    if (value.NEXT_PUBLIC_SUPABASE_URL && !value.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required when NEXT_PUBLIC_SUPABASE_URL is set.',
      });
    }

    if (value.NEXT_PUBLIC_SUPABASE_ANON_KEY && !value.NEXT_PUBLIC_SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_SUPABASE_URL'],
        message: 'NEXT_PUBLIC_SUPABASE_URL is required when NEXT_PUBLIC_SUPABASE_ANON_KEY is set.',
      });
    }

    if (value.SUPABASE_SERVICE_ROLE_KEY && !value.SUPABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'SUPABASE_URL is required when SUPABASE_SERVICE_ROLE_KEY is set.',
      });
    }

    if (value.SUPABASE_URL && !value.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'SUPABASE_SERVICE_ROLE_KEY is required when SUPABASE_URL is set.',
      });
    }
  });

export type EnvironmentConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvironmentConfig | null = null;
let hasValidated = false;
let lastMessage: string | null = null;

function normalizeEnv(env: NodeJS.ProcessEnv): NormalizedEnv {
  const normalized: NormalizedEnv = {};
  for (const [key, rawValue] of Object.entries(env)) {
    if (typeof rawValue !== 'string') {
      if (rawValue !== undefined) {
        normalized[key] = rawValue as string | undefined;
      }
      continue;
    }
    const trimmed = rawValue.trim();
    normalized[key] = trimmed.length === 0 ? undefined : trimmed;
  }
  return normalized;
}

function formatIssues(issues: z.ZodIssue[]): string {
  const lines: string[] = [];
  for (const issue of issues) {
    const pathSegment = issue.path[0];
    const path = typeof pathSegment === 'string' ? pathSegment : 'environment';
    const hint = helpText[path];
    const baseMessage = issue.message === 'Required'
      ? `${path} is required.`
      : `${path}: ${issue.message}`;
    lines.push(hint ? `${baseMessage} ${hint}` : baseMessage);
  }
  return ['Environment validation detected issues:', ...lines.map((line) => `- ${line}`)].join('\n');
}

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { force?: boolean } = {},
): EnvironmentConfig | null {
  if (hasValidated && !options.force && env === process.env) {
    return cachedEnv;
  }

  const normalized = normalizeEnv(env);
  const result = envSchema.safeParse(normalized);
  const mode = normalized.NODE_ENV ?? process.env.NODE_ENV ?? 'development';
  const isProd = mode === 'production';

  if (!result.success) {
    const message = formatIssues(result.error.issues);

    if (isProd) {
      throw new Error(message);
    }

    if (lastMessage !== message) {
      console.warn(message);
      lastMessage = message;
    }

    hasValidated = true;
    cachedEnv = null;
    return null;
  }

  cachedEnv = result.data;
  hasValidated = true;
  lastMessage = null;
  return cachedEnv;
}

export function getEnv(): EnvironmentConfig | null {
  return cachedEnv ?? validateEnv();
}
