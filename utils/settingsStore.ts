"use client";

import { get, del } from 'idb-keyval';
import { safeLocalStorage } from './safeStorage';
import { getTheme, setTheme } from './theme';

export type DensitySetting = 'regular' | 'compact';

export interface Preferences {
  accent: string;
  wallpaper: string;
  useKaliWallpaper: boolean;
  density: DensitySetting;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

interface PreferenceRecord<T> {
  version: number;
  data: T;
}

export const preferencesSchema: PreferenceRecord<Preferences> = {
  version: 1,
  data: {
    accent: '#1793d1',
    wallpaper: 'wall-2',
    useKaliWallpaper: false,
    density: 'regular',
    reducedMotion: false,
    fontScale: 1,
    highContrast: false,
    largeHitAreas: false,
    pongSpin: true,
    allowNetwork: false,
    haptics: true,
  },
};

export const defaults: Preferences = preferencesSchema.data;

const STORAGE_KEY = 'app:preferences';
const LEGACY_LOCAL_KEYS = [
  'use-kali-wallpaper',
  'density',
  'reduced-motion',
  'font-scale',
  'high-contrast',
  'large-hit-areas',
  'pong-spin',
  'allow-network',
  'haptics',
];

const MIGRATIONS: Record<number, (record: PreferenceRecord<any>) => PreferenceRecord<any>> = {
  0: (record) => ({
    version: 1,
    data: sanitizePreferences(record.data),
  }),
};

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseDensity(value: unknown): DensitySetting | undefined {
  if (value === 'regular' || value === 'compact') return value;
  return undefined;
}

function sanitizePreferences(input: unknown): Partial<Preferences> {
  if (!input || typeof input !== 'object') return {};
  const candidate = input as Record<string, unknown>;
  const result: Partial<Preferences> = {};

  if (typeof candidate.accent === 'string') result.accent = candidate.accent;
  if (typeof candidate.wallpaper === 'string') result.wallpaper = candidate.wallpaper;

  const useKaliWallpaper = parseBoolean(candidate.useKaliWallpaper);
  if (useKaliWallpaper !== undefined) result.useKaliWallpaper = useKaliWallpaper;

  const density = parseDensity(candidate.density);
  if (density) result.density = density;

  const reducedMotion = parseBoolean(candidate.reducedMotion);
  if (reducedMotion !== undefined) result.reducedMotion = reducedMotion;

  const fontScale = parseNumber(candidate.fontScale);
  if (fontScale !== undefined) result.fontScale = fontScale;

  const highContrast = parseBoolean(candidate.highContrast);
  if (highContrast !== undefined) result.highContrast = highContrast;

  const largeHitAreas = parseBoolean(candidate.largeHitAreas);
  if (largeHitAreas !== undefined) result.largeHitAreas = largeHitAreas;

  const pongSpin = parseBoolean(candidate.pongSpin);
  if (pongSpin !== undefined) result.pongSpin = pongSpin;

  const allowNetwork = parseBoolean(candidate.allowNetwork);
  if (allowNetwork !== undefined) result.allowNetwork = allowNetwork;

  const haptics = parseBoolean(candidate.haptics);
  if (haptics !== undefined) result.haptics = haptics;

  return result;
}

function normalizePreferences(input: unknown): Preferences {
  const sanitized = sanitizePreferences(input);
  return {
    accent: sanitized.accent ?? preferencesSchema.data.accent,
    wallpaper: sanitized.wallpaper ?? preferencesSchema.data.wallpaper,
    useKaliWallpaper:
      sanitized.useKaliWallpaper ?? preferencesSchema.data.useKaliWallpaper,
    density: sanitized.density ?? preferencesSchema.data.density,
    reducedMotion: sanitized.reducedMotion ?? preferencesSchema.data.reducedMotion,
    fontScale: sanitized.fontScale ?? preferencesSchema.data.fontScale,
    highContrast: sanitized.highContrast ?? preferencesSchema.data.highContrast,
    largeHitAreas: sanitized.largeHitAreas ?? preferencesSchema.data.largeHitAreas,
    pongSpin: sanitized.pongSpin ?? preferencesSchema.data.pongSpin,
    allowNetwork: sanitized.allowNetwork ?? preferencesSchema.data.allowNetwork,
    haptics: sanitized.haptics ?? preferencesSchema.data.haptics,
  };
}

function applyMigrations(record: PreferenceRecord<any>): PreferenceRecord<any> {
  let current = record;
  while (current.version < preferencesSchema.version) {
    const migrate = MIGRATIONS[current.version];
    if (!migrate) {
      return {
        version: preferencesSchema.version,
        data: { ...preferencesSchema.data },
      };
    }
    current = migrate(current);
  }
  return current;
}

async function loadLegacyPreferences(): Promise<PreferenceRecord<any> | null> {
  if (typeof window === 'undefined') return null;
  const legacy: Partial<Preferences> = {};
  let hasData = false;

  try {
    const [accent, wallpaper] = await Promise.all([
      get('accent').catch(() => undefined),
      get('bg-image').catch(() => undefined),
    ]);
    if (typeof accent === 'string') {
      legacy.accent = accent;
      hasData = true;
    }
    if (typeof wallpaper === 'string') {
      legacy.wallpaper = wallpaper;
      hasData = true;
    }
  } catch {
    // ignore legacy storage errors
  }

  const storage = safeLocalStorage;
  if (storage) {
    const useKali = storage.getItem('use-kali-wallpaper');
    if (useKali !== null) {
      legacy.useKaliWallpaper = useKali === 'true';
      hasData = true;
    }

    const density = parseDensity(storage.getItem('density'));
    if (density) {
      legacy.density = density;
      hasData = true;
    }

    const reducedMotion = parseBoolean(storage.getItem('reduced-motion'));
    if (reducedMotion !== undefined) {
      legacy.reducedMotion = reducedMotion;
      hasData = true;
    }

    const fontScale = parseNumber(storage.getItem('font-scale'));
    if (fontScale !== undefined) {
      legacy.fontScale = fontScale;
      hasData = true;
    }

    const highContrast = parseBoolean(storage.getItem('high-contrast'));
    if (highContrast !== undefined) {
      legacy.highContrast = highContrast;
      hasData = true;
    }

    const largeHitAreas = parseBoolean(storage.getItem('large-hit-areas'));
    if (largeHitAreas !== undefined) {
      legacy.largeHitAreas = largeHitAreas;
      hasData = true;
    }

    const pongSpin = parseBoolean(storage.getItem('pong-spin'));
    if (pongSpin !== undefined) {
      legacy.pongSpin = pongSpin;
      hasData = true;
    }

    const allowNetwork = parseBoolean(storage.getItem('allow-network'));
    if (allowNetwork !== undefined) {
      legacy.allowNetwork = allowNetwork;
      hasData = true;
    }

    const haptics = parseBoolean(storage.getItem('haptics'));
    if (haptics !== undefined) {
      legacy.haptics = haptics;
      hasData = true;
    }
  }

  return hasData ? { version: 0, data: legacy } : null;
}

async function clearLegacyPreferences(): Promise<void> {
  try {
    await Promise.all([
      del('accent').catch(() => undefined),
      del('bg-image').catch(() => undefined),
    ]);
  } catch {
    // ignore failures clearing legacy idb entries
  }

  const storage = safeLocalStorage;
  if (!storage) return;
  for (const key of LEGACY_LOCAL_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore individual removal failures
    }
  }
}

function persistPreferences(record: PreferenceRecord<Preferences>): void {
  const storage = safeLocalStorage;
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage quota failures
  }
}

async function readStoredPreferences(): Promise<PreferenceRecord<Preferences>> {
  if (typeof window === 'undefined') {
    return {
      version: preferencesSchema.version,
      data: { ...preferencesSchema.data },
    };
  }

  const storage = safeLocalStorage;
  if (!storage) {
    return {
      version: preferencesSchema.version,
      data: { ...preferencesSchema.data },
    };
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (!raw) {
    const legacy = await loadLegacyPreferences();
    if (legacy) {
      const migrated = applyMigrations(legacy);
      const normalized = normalizePreferences(migrated.data);
      const record: PreferenceRecord<Preferences> = {
        version: preferencesSchema.version,
        data: normalized,
      };
      persistPreferences(record);
      await clearLegacyPreferences();
      return record;
    }

    return {
      version: preferencesSchema.version,
      data: { ...preferencesSchema.data },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      version: preferencesSchema.version,
      data: { ...preferencesSchema.data },
    };
  }

  let record: PreferenceRecord<any>;
  if (
    parsed &&
    typeof parsed === 'object' &&
    'version' in parsed &&
    typeof (parsed as { version?: unknown }).version === 'number'
  ) {
    record = parsed as PreferenceRecord<any>;
  } else {
    record = { version: 0, data: parsed };
  }

  const migrated = applyMigrations(record);
  const normalized = normalizePreferences(migrated.data);
  const finalRecord: PreferenceRecord<Preferences> = {
    version: preferencesSchema.version,
    data: normalized,
  };
  persistPreferences(finalRecord);
  return finalRecord;
}

export async function getPreferences(): Promise<Preferences> {
  const record = await readStoredPreferences();
  return { ...record.data };
}

export async function updatePreferences(
  update: Partial<Preferences>,
): Promise<Preferences> {
  const current = await getPreferences();
  const sanitizedUpdate = sanitizePreferences(update);
  const next: Preferences = {
    ...current,
    ...sanitizedUpdate,
  };
  persistPreferences({ version: preferencesSchema.version, data: next });
  return next;
}

export async function resetPreferences(): Promise<void> {
  const storage = safeLocalStorage;
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore failures when clearing
    }
  }
  await clearLegacyPreferences();
}

export async function exportPreferences(): Promise<string> {
  const preferences = await getPreferences();
  const theme = getTheme();
  return JSON.stringify({
    version: preferencesSchema.version,
    preferences,
    theme,
  });
}

export async function importPreferences(input: string | Record<string, unknown>): Promise<Preferences> {
  if (typeof window === 'undefined') return { ...preferencesSchema.data };

  let payload: any = input;
  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input);
    } catch {
      throw new Error('Invalid preferences payload');
    }
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid preferences payload');
  }

  let data: unknown = payload;
  if ('preferences' in payload && typeof payload.preferences === 'object') {
    data = payload.preferences;
  }

  const next = normalizePreferences(data);
  persistPreferences({ version: preferencesSchema.version, data: next });

  if (typeof payload.theme === 'string') {
    setTheme(payload.theme);
  }

  return next;
}

// Backwards compatible named exports for existing imports
export {
  exportPreferences as exportSettings,
  importPreferences as importSettings,
  resetPreferences as resetSettings,
};
