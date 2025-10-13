import seedrandom from 'seedrandom';

export const FLAG_LOCAL_STORAGE_KEY = 'kali.flags.overrides';
export const FLAG_STORAGE_USER_ID_KEY = 'kali.flags.visitorId';
export const FLAG_QUERY_PREFIX = 'flag:';
export const FLAG_COOKIE_NAME = 'kali_flag_seed';
const FLAG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5; // five years

export interface FlagDefinition {
  /**
   * Human readable description used by docs and tooling.
   */
  description?: string;
  /**
   * Percentage rollout between 0 and 100. Undefined means always use defaultValue.
   */
  rolloutPercentage?: number;
  /**
   * Default value if the flag is not rolled out.
   */
  defaultValue?: boolean;
}

export type FlagRegistry = Record<string, FlagDefinition>;

export type FlagOverrides = Record<string, boolean>;

export type FlagDecisions = Record<string, boolean>;

export interface FlagEvaluation {
  seed: string;
  decisions: FlagDecisions;
  overrides: FlagOverrides;
}

export const flagDefinitions: FlagRegistry = {
  'shell.commandPalette': {
    description: 'Enables the experimental desktop command palette overlay.',
    defaultValue: false,
    rolloutPercentage: 0,
  },
};

export const generateFlagSeed = (): string => {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto : undefined;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, '');
  }

  if (globalCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalCrypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const fallback = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  return fallback.padEnd(32, '0').slice(0, 32);
};

export const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['1', 'true', 'on', 'yes', 'enable', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'off', 'no', 'disable', 'disabled'].includes(normalized)) return false;
  }
  return undefined;
};

export const parseFlagOverridesFromQuery = (
  query: Record<string, string | string[] | undefined>,
): FlagOverrides => {
  const overrides: FlagOverrides = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith(FLAG_QUERY_PREFIX)) continue;
    const flag = key.slice(FLAG_QUERY_PREFIX.length);
    if (!flag) continue;

    const raw = Array.isArray(value) ? value[value.length - 1] : value;
    const coerced = coerceBoolean(raw);
    if (coerced === undefined) continue;
    overrides[flag] = coerced;
  }
  return overrides;
};

export const parseFlagOverridesFromSearch = (search: string): FlagOverrides => {
  try {
    const params = new URLSearchParams(search);
    const entries: Record<string, string | string[]> = {};
    for (const [key, value] of params.entries()) {
      if (entries[key]) {
        const current = entries[key];
        entries[key] = Array.isArray(current) ? [...current, value] : [current as string, value];
      } else {
        entries[key] = value;
      }
    }
    return parseFlagOverridesFromQuery(entries);
  } catch (err) {
    console.warn('Failed to parse flag overrides from location search', err);
    return {};
  }
};

export const readFlagOverridesFromStorage = (storage?: Storage | null): FlagOverrides => {
  if (!storage) return {};
  try {
    const raw = storage.getItem(FLAG_LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const overrides: FlagOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      const coerced = coerceBoolean(value);
      if (coerced !== undefined) overrides[key] = coerced;
    }
    return overrides;
  } catch (err) {
    console.warn('Failed to read flag overrides from storage', err);
    return {};
  }
};

export const writeFlagOverridesToStorage = (
  storage: Storage | null | undefined,
  overrides: FlagOverrides,
): void => {
  if (!storage) return;
  try {
    const normalized: FlagOverrides = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'boolean') normalized[key] = value;
    }
    storage.setItem(FLAG_LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn('Failed to persist flag overrides', err);
  }
};

export const mergeFlagOverrides = (...entries: Array<FlagOverrides | undefined>): FlagOverrides => {
  const merged: FlagOverrides = {};
  for (const entry of entries) {
    if (!entry) continue;
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === 'boolean') merged[key] = value;
    }
  }
  return merged;
};

const evaluateSingleFlag = (seed: string, flag: string, definition: FlagDefinition): boolean => {
  const defaultValue = definition.defaultValue ?? false;
  if (definition.rolloutPercentage === undefined) return defaultValue;

  const rollout = clamp(definition.rolloutPercentage, 0, 100);
  if (rollout === 0) return false;
  if (rollout === 100) return true;

  const rng = seedrandom(`${seed}:${flag}`);
  const bucket = rng.quick() * 100;
  return bucket < rollout;
};

export const evaluateFlags = (
  definitions: FlagRegistry,
  seed: string,
  overrides?: FlagOverrides,
): FlagDecisions => {
  const decisions: FlagDecisions = {};
  for (const [flag, definition] of Object.entries(definitions)) {
    const override = overrides?.[flag];
    if (typeof override === 'boolean') {
      decisions[flag] = override;
      continue;
    }
    decisions[flag] = evaluateSingleFlag(seed, flag, definition);
  }
  return decisions;
};

export const toServerCookie = (seed: string): string =>
  `${FLAG_COOKIE_NAME}=${encodeURIComponent(seed)}; Path=/; Max-Age=${FLAG_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;

export const getSeedFromCookieHeader = (cookieHeader?: string): string | undefined => {
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [rawKey, ...rawValue] = pair.split('=');
    const key = rawKey?.trim();
    if (key !== FLAG_COOKIE_NAME) continue;
    return decodeURIComponent(rawValue.join('=')?.trim() ?? '');
  }
  return undefined;
};

export const ensureServerSeed = (
  cookieHeader: string | undefined,
  setCookie: (value: string) => void,
  fallbackSeed?: string,
): string => {
  const existing = getSeedFromCookieHeader(cookieHeader) ?? fallbackSeed;
  if (existing) return existing;
  const seed = generateFlagSeed();
  setCookie(toServerCookie(seed));
  return seed;
};

export const ensureClientSeed = (
  storage: Storage | null | undefined,
  initialSeed?: string,
): string => {
  if (!storage) return initialSeed ?? generateFlagSeed();
  try {
    const stored = storage.getItem(FLAG_STORAGE_USER_ID_KEY);
    if (stored) return stored;
    const seed = initialSeed ?? generateFlagSeed();
    storage.setItem(FLAG_STORAGE_USER_ID_KEY, seed);
    return seed;
  } catch (err) {
    console.warn('Failed to ensure client flag seed from storage', err);
    return initialSeed ?? generateFlagSeed();
  }
};

