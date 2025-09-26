export const config = {
  runtime: 'edge',
};

type FlagDefinition = {
  name: string;
  env: string;
  truthy?: readonly string[];
  fallback?: boolean;
};

type FlagsPayload = {
  environment: string;
  flags: Record<string, boolean>;
  timestamp: string;
};

const DEFAULT_TRUTHY = ['1', 'true', 'on', 'yes', 'enabled'] as const;

const FLAG_DEFINITIONS: readonly FlagDefinition[] = [
  {
    name: 'uiExperiments',
    env: 'NEXT_PUBLIC_UI_EXPERIMENTS',
    truthy: ['1', 'true'],
    fallback: false,
  },
  {
    name: 'toolApis',
    env: 'FEATURE_TOOL_APIS',
    truthy: ['enabled', 'true', '1'],
    fallback: false,
  },
  {
    name: 'hydraApi',
    env: 'FEATURE_HYDRA',
    truthy: ['enabled', 'true', '1'],
    fallback: false,
  },
];

function toBoolean(
  value: string | null | undefined,
  truthy: readonly string[] = DEFAULT_TRUTHY,
  fallback = false,
) {
  if (value == null) return fallback;
  return truthy.includes(value.trim().toLowerCase());
}

function collectFlags(
  env: Record<string, string | undefined>,
  params: URLSearchParams,
) {
  const entries: [string, boolean][] = FLAG_DEFINITIONS.map(
    ({ name, env: envKey, truthy, fallback }) => {
      const override = params.get(name);
      if (override !== null) {
        return [name, toBoolean(override, truthy ?? DEFAULT_TRUTHY, fallback)];
      }

      return [
        name,
        toBoolean(env[envKey], truthy ?? DEFAULT_TRUTHY, fallback),
      ];
    },
  );

  return Object.fromEntries(entries);
}

function buildPayload(flags: Record<string, boolean>): FlagsPayload {
  const environment =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    'development';

  return {
    environment,
    flags,
    timestamp: new Date().toISOString(),
  };
}

export default function handler(request: Request) {
  const { method } = request;
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: {
          Allow: 'GET, HEAD',
          'Content-Type': 'application/json',
        },
      },
    );
  }

  const url = new URL(request.url);
  const flags = collectFlags(
    process.env as Record<string, string | undefined>,
    url.searchParams,
  );
  const payload = buildPayload(flags);

  if (method === 'HEAD') {
    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=60',
      },
    });
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=60',
      'Content-Type': 'application/json',
    },
  });
}
