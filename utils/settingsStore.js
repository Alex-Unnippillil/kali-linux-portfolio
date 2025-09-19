"use client";

import { get, set, del } from 'idb-keyval';
import { z } from 'zod';
import logger from './logger';
import { getTheme, setTheme } from './theme';

const SETTINGS_SCHEMA_VERSION = 1;

const settingsDataSchema = z
  .object({
    accent: z.string().min(1).optional(),
    wallpaper: z.string().min(1).optional(),
    density: z.enum(['regular', 'compact']).optional(),
    reducedMotion: z.boolean().optional(),
    fontScale: z.number().min(0.5).max(2).optional(),
    highContrast: z.boolean().optional(),
    largeHitAreas: z.boolean().optional(),
    pongSpin: z.boolean().optional(),
    haptics: z.boolean().optional(),
    theme: z.string().min(1).optional(),
  })
  .strict();

const settingsFileSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    exportedAt: z.string().optional(),
    data: settingsDataSchema,
  })
  .strict();

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

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getDensity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
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
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
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
    getHaptics(),
  ]);
  const theme = getTheme();
  const data = {
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    haptics,
    theme,
  };
  return JSON.stringify({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  });
}

function computeDiff(previous, next) {
  return Object.entries(next).reduce((changes, [key, value]) => {
    if (value === undefined) return changes;
    if (!Object.prototype.hasOwnProperty.call(previous, key)) return changes;
    if (!Object.is(previous[key], value)) {
      changes.push({ key, previous: previous[key], next: value });
    }
    return changes;
  }, []);
}

async function getCurrentSettingsSnapshot() {
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
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
    getHaptics(),
  ]);
  const theme = getTheme();
  return {
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    haptics,
    theme,
  };
}

async function applySettingsData(data) {
  const tasks = [];
  if (data.accent !== undefined) tasks.push(setAccent(data.accent));
  if (data.wallpaper !== undefined) tasks.push(setWallpaper(data.wallpaper));
  if (data.density !== undefined) tasks.push(setDensity(data.density));
  if (data.reducedMotion !== undefined)
    tasks.push(setReducedMotion(data.reducedMotion));
  if (data.fontScale !== undefined) tasks.push(setFontScale(data.fontScale));
  if (data.highContrast !== undefined)
    tasks.push(setHighContrast(data.highContrast));
  if (data.largeHitAreas !== undefined)
    tasks.push(setLargeHitAreas(data.largeHitAreas));
  if (data.pongSpin !== undefined) tasks.push(setPongSpin(data.pongSpin));
  if (data.haptics !== undefined) tasks.push(setHaptics(data.haptics));
  await Promise.all(tasks);
  if (data.theme !== undefined) setTheme(data.theme);
}

function parseSettingsJson(json) {
  let raw;
  try {
    raw = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (error) {
    logger.error('Settings import parse failure', error);
    throw new Error('Settings file is not valid JSON.');
  }

  const parsed = settingsFileSchema.safeParse(raw);
  if (!parsed.success) {
    const unsupported = parsed.error.issues
      .filter((issue) => issue.code === 'unrecognized_keys')
      .flatMap((issue) => issue.keys || []);

    if (unsupported.length > 0) {
      logger.error('Settings import contains unsupported fields', {
        unsupported,
      });
      throw new Error(
        `Settings file contains unsupported fields: ${unsupported.join(', ')}.`
      );
    }

    const missingSchemaVersion = parsed.error.issues.some(
      (issue) =>
        issue.path[0] === 'schemaVersion' && issue.code === 'invalid_type'
    );
    if (missingSchemaVersion) {
      logger.error('Settings import missing schema version metadata');
      throw new Error('Settings file is missing schema version metadata.');
    }

    logger.error('Settings import schema validation failed', parsed.error);
    throw new Error('Settings file is not compatible with this version.');
  }

  if (parsed.data.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    logger.error('Unsupported settings schema version', {
      schemaVersion: parsed.data.schemaVersion,
    });
    throw new Error(
      `Settings file uses schema version ${parsed.data.schemaVersion}, but version ${SETTINGS_SCHEMA_VERSION} is required.`
    );
  }

  return parsed.data;
}

export async function importSettings(json, options = {}) {
  if (typeof window === 'undefined') {
    logger.error('Settings import attempted outside the browser environment');
    throw new Error('Settings can only be imported in the browser.');
  }

  const parsed = parseSettingsJson(json);
  const current = await getCurrentSettingsSnapshot();
  const diff = computeDiff(current, parsed.data);

  let applied = false;
  const apply = async () => {
    if (applied) {
      return;
    }
    await applySettingsData(parsed.data);
    applied = true;
  };

  if (options.apply === true) {
    await apply();
  }

  return {
    diff,
    metadata: {
      schemaVersion: parsed.schemaVersion,
      exportedAt: parsed.exportedAt,
    },
    data: parsed.data,
    apply,
  };
}

export const defaults = DEFAULT_SETTINGS;
