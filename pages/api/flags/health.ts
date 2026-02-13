import type { NextApiRequest, NextApiResponse } from 'next';

const FEATURE_PREFIX = 'FEATURE_';
const KNOWN_FLAGS = ['FEATURE_TOOL_APIS', 'FEATURE_HYDRA'];

type FlagSnapshot = {
  enabled: boolean;
  value: string | null;
};

type FlagsHealthResponse = {
  ok: true;
  timestamp: string;
  enabledGates: string[];
  flags: Record<string, FlagSnapshot>;
};

export function snapshotFlags(env: NodeJS.ProcessEnv) {
  const candidates = new Set<string>(KNOWN_FLAGS);
  for (const key of Object.keys(env)) {
    if (key.startsWith(FEATURE_PREFIX)) {
      candidates.add(key);
    }
  }

  const sortedKeys = Array.from(candidates).sort();
  const flags: Record<string, FlagSnapshot> = {};
  const enabledGates: string[] = [];

  for (const key of sortedKeys) {
    const rawValue = env[key];
    const normalized = typeof rawValue === 'string' ? rawValue.toLowerCase() : '';
    const enabled = normalized === 'enabled';
    flags[key] = { enabled, value: rawValue ?? null };
    if (enabled) {
      enabledGates.push(key);
    }
  }

  return { flags, enabledGates };
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<FlagsHealthResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { flags, enabledGates } = snapshotFlags(process.env);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    enabledGates,
    flags,
  });
}
