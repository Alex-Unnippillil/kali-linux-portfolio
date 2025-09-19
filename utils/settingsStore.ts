"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

type Density = 'regular' | 'compact';

export interface Settings {
  accent: string;
  wallpaper: string;
  density: Density;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

export interface SettingsSnapshot extends Settings {
  theme: string;
}

type SettingsInput = Partial<SettingsSnapshot> | string;

const isDensity = (value: string | null): value is Density =>
  value === 'regular' || value === 'compact';

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) return fallback;
  return value === 'true';
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const DEFAULT_SETTINGS: Settings = {
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

export async function getAccent(): Promise<Settings['accent']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  const stored = await get<string>('accent');
  return stored ?? DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent: Settings['accent']): Promise<void> {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper(): Promise<Settings['wallpaper']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  const stored = await get<string>('bg-image');
  return stored ?? DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper: Settings['wallpaper']): Promise<void> {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getDensity(): Promise<Settings['density']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  const stored = window.localStorage.getItem('density');
  return stored && isDensity(stored) ? stored : DEFAULT_SETTINGS.density;
}

export async function setDensity(density: Settings['density']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion(): Promise<Settings['reducedMotion']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value: Settings['reducedMotion']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale(): Promise<Settings['fontScale']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  if (stored === null) return DEFAULT_SETTINGS.fontScale;
  const parsed = Number.parseFloat(stored);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale: Settings['fontScale']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast(): Promise<Settings['highContrast']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  const stored = window.localStorage.getItem('high-contrast');
  return parseBoolean(stored, DEFAULT_SETTINGS.highContrast);
}

export async function setHighContrast(value: Settings['highContrast']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas(): Promise<Settings['largeHitAreas']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  const stored = window.localStorage.getItem('large-hit-areas');
  return parseBoolean(stored, DEFAULT_SETTINGS.largeHitAreas);
}

export async function setLargeHitAreas(value: Settings['largeHitAreas']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics(): Promise<Settings['haptics']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const stored = window.localStorage.getItem('haptics');
  return parseBoolean(stored, DEFAULT_SETTINGS.haptics);
}

export async function setHaptics(value: Settings['haptics']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin(): Promise<Settings['pongSpin']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const stored = window.localStorage.getItem('pong-spin');
  return parseBoolean(stored, DEFAULT_SETTINGS.pongSpin);
}

export async function setPongSpin(value: Settings['pongSpin']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork(): Promise<Settings['allowNetwork']> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  const stored = window.localStorage.getItem('allow-network');
  return parseBoolean(stored, DEFAULT_SETTINGS.allowNetwork);
}

export async function setAllowNetwork(value: Settings['allowNetwork']): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings(): Promise<void> {
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

export async function exportSettings(): Promise<string> {
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
  const snapshot: SettingsSnapshot = {
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
  };
  return JSON.stringify(snapshot);
}

const parseSettingsInput = (json: SettingsInput): Partial<SettingsSnapshot> | null => {
  if (typeof json !== 'string') return json ?? null;
  try {
    const parsed = JSON.parse(json) as Partial<SettingsSnapshot>;
    return parsed;
  } catch (error) {
    console.error('Invalid settings', error);
    return null;
  }
};

export async function importSettings(json: SettingsInput): Promise<void> {
  if (typeof window === 'undefined') return;
  const settings = parseSettingsInput(json);
  if (!settings) return;
  const {
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
  if (accent !== undefined) {
    const value = coerceString(accent);
    if (value !== undefined) await setAccent(value);
  }
  if (wallpaper !== undefined) {
    const value = coerceString(wallpaper);
    if (value !== undefined) await setWallpaper(value);
  }
  if (density !== undefined && isDensity(density)) await setDensity(density);
  if (reducedMotion !== undefined) {
    const value = coerceBoolean(reducedMotion);
    if (value !== undefined) await setReducedMotion(value);
  }
  if (fontScale !== undefined) {
    const value = coerceNumber(fontScale);
    if (value !== undefined) await setFontScale(value);
  }
  if (highContrast !== undefined) {
    const value = coerceBoolean(highContrast);
    if (value !== undefined) await setHighContrast(value);
  }
  if (largeHitAreas !== undefined) {
    const value = coerceBoolean(largeHitAreas);
    if (value !== undefined) await setLargeHitAreas(value);
  }
  if (pongSpin !== undefined) {
    const value = coerceBoolean(pongSpin);
    if (value !== undefined) await setPongSpin(value);
  }
  if (allowNetwork !== undefined) {
    const value = coerceBoolean(allowNetwork);
    if (value !== undefined) await setAllowNetwork(value);
  }
  if (haptics !== undefined) {
    const value = coerceBoolean(haptics);
    if (value !== undefined) await setHaptics(value);
  }
  if (theme !== undefined) {
    const value = coerceString(theme);
    if (value !== undefined) setTheme(value);
  }
}

export const defaults: Settings = DEFAULT_SETTINGS;
