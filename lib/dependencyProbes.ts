export type DependencyCategory = 'browser' | 'environment' | 'feature';

export interface DependencyCheck {
  id: string;
  category: DependencyCategory;
  name: string;
  key?: string;
  ok: boolean;
  description?: string;
}

export interface DependencyProbeResult {
  checks: DependencyCheck[];
  missing: DependencyCheck[];
  summary: string;
  messages: string[];
}

export interface DependencyProbeContext {
  window?: any;
  navigator?: any;
  env?: Record<string, string | undefined>;
}

function hasLocalStorage(windowRef: any): boolean {
  if (!windowRef || typeof windowRef !== 'object') {
    return false;
  }
  try {
    const storage = windowRef.localStorage;
    if (!storage) return false;
    const testKey = '__boot_probe__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function hasIndexedDB(windowRef: any): boolean {
  if (!windowRef || typeof windowRef !== 'object') {
    return false;
  }
  try {
    return 'indexedDB' in windowRef && !!windowRef.indexedDB;
  } catch {
    return false;
  }
}

function formatLabel(check: DependencyCheck, includeDescription = false): string {
  const keyPart = check.key ? ` (${check.key})` : '';
  const descriptionPart = includeDescription && check.description ? ` – ${check.description}` : '';
  switch (check.category) {
    case 'browser':
      return `Browser API: ${check.name}${keyPart}${descriptionPart}`;
    case 'feature':
      return `Feature flag: ${check.name}${keyPart}${descriptionPart}`;
    default:
      return `Environment variable: ${check.name}${keyPart}${descriptionPart}`;
  }
}

function recordCheck(
  checks: DependencyCheck[],
  missing: DependencyCheck[],
  check: DependencyCheck,
) {
  checks.push(check);
  if (!check.ok) {
    missing.push(check);
  }
}

export function runDependencyProbes(
  context: DependencyProbeContext = {},
): DependencyProbeResult {
  const baseEnv =
    typeof process !== 'undefined' && process.env ? (process.env as Record<string, string | undefined>) : {};
  const env = { ...baseEnv, ...(context.env || {}) };
  const windowRef =
    context.window !== undefined
      ? context.window
      : typeof window !== 'undefined'
      ? window
      : undefined;
  const checks: DependencyCheck[] = [];
  const missing: DependencyCheck[] = [];

  if (windowRef) {
    recordCheck(checks, missing, {
      id: 'browser.localStorage',
      category: 'browser',
      name: 'localStorage',
      ok: hasLocalStorage(windowRef),
      description: 'Required for desktop preferences and saved games.',
    });

    const hasFetch = typeof (windowRef.fetch ?? globalThis.fetch) === 'function';
    recordCheck(checks, missing, {
      id: 'browser.fetch',
      category: 'browser',
      name: 'fetch',
      ok: hasFetch,
      description: 'Used for API routes and remote data.',
    });

    recordCheck(checks, missing, {
      id: 'browser.indexedDB',
      category: 'browser',
      name: 'IndexedDB',
      ok: hasIndexedDB(windowRef),
      description: 'Stores offline puzzles, caches, and larger saves.',
    });

    const cryptoOk = !!windowRef.crypto && typeof windowRef.crypto.getRandomValues === 'function';
    recordCheck(checks, missing, {
      id: 'browser.crypto',
      category: 'browser',
      name: 'crypto.getRandomValues',
      ok: cryptoOk,
      description: 'Needed for secure IDs and randomness.',
    });
  }

  const requiredEnv: Array<{ key: string; name: string }> = [
    { key: 'NEXT_PUBLIC_SERVICE_ID', name: 'EmailJS service ID' },
    { key: 'NEXT_PUBLIC_TEMPLATE_ID', name: 'EmailJS template ID' },
    { key: 'NEXT_PUBLIC_USER_ID', name: 'EmailJS public key' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', name: 'Supabase client URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', name: 'Supabase client anon key' },
    { key: 'SUPABASE_URL', name: 'Supabase service URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', name: 'Supabase service role key' },
    { key: 'SUPABASE_ANON_KEY', name: 'Supabase anon key' },
  ];

  requiredEnv.forEach(({ key, name }) => {
    const value = env[key];
    const ok = typeof value === 'string' && value.trim().length > 0;
    recordCheck(checks, missing, {
      id: `environment.${key}`,
      category: 'environment',
      name,
      key,
      ok,
    });
  });

  const toolApis = (env.FEATURE_TOOL_APIS || '').trim().toLowerCase();
  if (toolApis && !['enabled', 'disabled'].includes(toolApis)) {
    recordCheck(checks, missing, {
      id: 'feature.FEATURE_TOOL_APIS',
      category: 'feature',
      name: 'FEATURE_TOOL_APIS',
      key: 'FEATURE_TOOL_APIS',
      ok: false,
      description: 'Set to "enabled" or "disabled".',
    });
  }

  const hydraFlag = (env.FEATURE_HYDRA || '').trim().toLowerCase();
  if (hydraFlag && !['enabled', 'disabled'].includes(hydraFlag)) {
    recordCheck(checks, missing, {
      id: 'feature.FEATURE_HYDRA',
      category: 'feature',
      name: 'FEATURE_HYDRA',
      key: 'FEATURE_HYDRA',
      ok: false,
      description: 'Set to "enabled" or "disabled".',
    });
  } else if (hydraFlag === 'enabled' && toolApis !== 'enabled') {
    recordCheck(checks, missing, {
      id: 'feature.FEATURE_HYDRA.requiresToolApis',
      category: 'feature',
      name: 'FEATURE_HYDRA',
      key: 'FEATURE_HYDRA',
      ok: false,
      description: 'Enable FEATURE_TOOL_APIS before enabling Hydra routes.',
    });
  }

  const summary = missing.length
    ? `Missing dependencies: ${missing.map((check) => formatLabel(check)).join(', ')}.`
    : 'All dependency checks passed.';

  const messages = missing.map((check) => formatLabel(check, true));

  return {
    checks,
    missing,
    summary,
    messages,
  };
}
