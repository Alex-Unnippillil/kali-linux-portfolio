"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

export const CURRENT_SETTINGS_SCHEMA_VERSION = 1;

const SETTINGS_VERSION_KEY = 'settings-schema-version';

const BOOLEAN_SETTINGS = [
  { key: 'reduced-motion', defaultValue: DEFAULT_SETTINGS.reducedMotion },
  { key: 'high-contrast', defaultValue: DEFAULT_SETTINGS.highContrast },
  { key: 'large-hit-areas', defaultValue: DEFAULT_SETTINGS.largeHitAreas },
  { key: 'pong-spin', defaultValue: DEFAULT_SETTINGS.pongSpin },
  { key: 'allow-network', defaultValue: DEFAULT_SETTINGS.allowNetwork },
  { key: 'haptics', defaultValue: DEFAULT_SETTINGS.haptics },
];

const VALID_DENSITIES = new Set(['regular', 'compact']);

const IDB_SETTING_KEYS = ['accent', 'bg-image'];

let migrationPromise = null;

function readSchemaVersion() {
  if (typeof window === 'undefined') return CURRENT_SETTINGS_SCHEMA_VERSION;
  const raw = window.localStorage.getItem(SETTINGS_VERSION_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeSchemaVersion(version) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_VERSION_KEY, String(version));
}

async function captureSnapshot() {
  if (typeof window === 'undefined') return null;

  const localEntries = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    localEntries.push([key, window.localStorage.getItem(key)]);
  }

  const idbValues = await Promise.all(
    IDB_SETTING_KEYS.map(async (key) => [key, await get(key)]),
  );

  return { localEntries, idbValues };
}

async function restoreSnapshot(snapshot) {
  if (!snapshot || typeof window === 'undefined') return;

  window.localStorage.clear();
  snapshot.localEntries.forEach(([key, value]) => {
    if (typeof value === 'string') {
      window.localStorage.setItem(key, value);
    }
  });

  await Promise.all(
    snapshot.idbValues.map(async ([key, value]) => {
      if (value === undefined) {
        await del(key);
      } else {
        await set(key, value);
      }
    }),
  );
}

function normalizeBooleanSettings() {
  BOOLEAN_SETTINGS.forEach(({ key, defaultValue }) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false') {
      if (normalized !== raw) {
        window.localStorage.setItem(key, normalized);
      }
      return;
    }
    if (raw === '1') {
      window.localStorage.setItem(key, 'true');
      return;
    }
    if (raw === '0') {
      window.localStorage.setItem(key, 'false');
      return;
    }
    window.localStorage.setItem(key, defaultValue ? 'true' : 'false');
  });
}

function normalizeDensity() {
  const density = window.localStorage.getItem('density');
  if (density && !VALID_DENSITIES.has(density)) {
    window.localStorage.setItem('density', DEFAULT_SETTINGS.density);
  }
}

function normalizeFontScale() {
  const stored = window.localStorage.getItem('font-scale');
  if (stored === null) return;
  const parsed = Number.parseFloat(stored);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    window.localStorage.setItem('font-scale', String(DEFAULT_SETTINGS.fontScale));
  } else {
    window.localStorage.setItem('font-scale', String(parsed));
  }
}

async function migrateZeroToOne() {
  if (typeof window === 'undefined') return;
  normalizeBooleanSettings();
  normalizeDensity();
  normalizeFontScale();
}

const MIGRATIONS = new Map([
  [0, { to: 1, migrate: migrateZeroToOne }],
]);

async function ensureMigrations() {
  if (typeof window === 'undefined') return;

  if (!migrationPromise) {
    migrationPromise = (async () => {
      const startingVersion = readSchemaVersion();
      if (startingVersion >= CURRENT_SETTINGS_SCHEMA_VERSION) return;

      const snapshot = await captureSnapshot();

      try {
        let version = startingVersion;
        while (version < CURRENT_SETTINGS_SCHEMA_VERSION) {
          const step = MIGRATIONS.get(version);
          if (!step) {
            throw new Error(`Missing migration for schema version ${version}`);
          }
          await step.migrate();
          version = step.to;
          writeSchemaVersion(version);
        }
      } catch (error) {
        await restoreSnapshot(snapshot);
        throw error;
      }
    })();
  }

  try {
    await migrationPromise;
  } catch (error) {
    console.error('[settingsStore] Failed to migrate settings schema', error);
  } finally {
    migrationPromise = null;
  }
}

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  await ensureMigrations();
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  await set('accent', accent);
}

export async function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  await ensureMigrations();
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  await set('bg-image', wallpaper);
}

export async function getDensity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  await ensureMigrations();
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  await ensureMigrations();
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  await ensureMigrations();
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  await ensureMigrations();
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  await ensureMigrations();
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  await ensureMigrations();
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  await ensureMigrations();
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  await ensureMigrations();
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
  await ensureMigrations();
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
  window.localStorage.removeItem(SETTINGS_VERSION_KEY);
}

export async function exportSettings() {
  await ensureMigrations();
  const schemaVersion = readSchemaVersion();
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
  ] = await Promise.all([
    getAccent(),
    getWallpaper(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
  ]);
  const theme = getTheme();
  return JSON.stringify({
    schemaVersion,
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  });
}

export async function importSettings(json) {
  if (typeof window === 'undefined') return;
  let settings;
  try {
    settings = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    console.error('Invalid settings', e);
    return;
  }
  await ensureMigrations();
  const {
    schemaVersion: _schemaVersion,
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  } = settings;
  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
