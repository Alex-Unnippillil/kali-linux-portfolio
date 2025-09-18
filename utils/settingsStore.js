"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const TERMINAL_FONT_SCALE_KEY = 'terminalFontScale';
const LEGACY_TERMINAL_FONT_KEY = 'terminal-font';
const TERMINAL_THEME_KEY = 'terminalTheme';
const LEGACY_TERMINAL_THEME_KEY = 'terminal-theme';
const TERMINAL_SIZE_KEY = 'terminalSize';
const LEGACY_TERMINAL_SIZE_KEY = 'terminal-size';

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
  terminalFontScale: 1,
  terminalTheme: 'kali',
  terminalSize: { width: 640, height: 384 },
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

const parseNumber = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseTerminalSize = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return {
          width: Math.max(0, Math.round(parsed.width)),
          height: Math.max(0, Math.round(parsed.height)),
        };
      }
    } catch (e) {
      const match = value.trim().match(/^(\d+)(?:x|,|\s+)(\d+)$/i);
      if (match) {
        return {
          width: Math.max(0, parseInt(match[1], 10)),
          height: Math.max(0, parseInt(match[2], 10)),
        };
      }
    }
  } else if (typeof value === 'object' && value) {
    const { width, height } = value;
    if (typeof width === 'number' && typeof height === 'number') {
      return {
        width: Math.max(0, Math.round(width)),
        height: Math.max(0, Math.round(height)),
      };
    }
  }
  return undefined;
};

export async function getTerminalFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.terminalFontScale;
  const stored = window.localStorage.getItem(TERMINAL_FONT_SCALE_KEY);
  if (stored !== null) {
    const parsed = parseNumber(stored);
    return parsed !== undefined ? parsed : DEFAULT_SETTINGS.terminalFontScale;
  }
  const legacy = window.localStorage.getItem(LEGACY_TERMINAL_FONT_KEY);
  if (legacy !== null) {
    window.localStorage.removeItem(LEGACY_TERMINAL_FONT_KEY);
    const parsed = parseNumber(legacy);
    const scale = parsed !== undefined ? parsed : DEFAULT_SETTINGS.terminalFontScale;
    window.localStorage.setItem(TERMINAL_FONT_SCALE_KEY, String(scale));
    return scale;
  }
  return DEFAULT_SETTINGS.terminalFontScale;
}

export async function setTerminalFontScale(scale) {
  if (typeof window === 'undefined') return;
  const parsed = parseNumber(scale);
  const value = parsed !== undefined && parsed > 0 ? parsed : DEFAULT_SETTINGS.terminalFontScale;
  window.localStorage.setItem(TERMINAL_FONT_SCALE_KEY, String(value));
}

export async function getTerminalTheme() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.terminalTheme;
  const stored = window.localStorage.getItem(TERMINAL_THEME_KEY);
  if (stored) return stored;
  const legacy = window.localStorage.getItem(LEGACY_TERMINAL_THEME_KEY);
  if (legacy) {
    window.localStorage.removeItem(LEGACY_TERMINAL_THEME_KEY);
    window.localStorage.setItem(TERMINAL_THEME_KEY, legacy);
    return legacy;
  }
  return DEFAULT_SETTINGS.terminalTheme;
}

export async function setTerminalTheme(theme) {
  if (typeof window === 'undefined') return;
  if (theme === undefined || theme === null) {
    window.localStorage.removeItem(TERMINAL_THEME_KEY);
  } else {
    window.localStorage.setItem(TERMINAL_THEME_KEY, String(theme));
  }
}

export async function getTerminalSize() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS.terminalSize };
  const stored = window.localStorage.getItem(TERMINAL_SIZE_KEY);
  const parsedStored = parseTerminalSize(stored);
  if (parsedStored) return parsedStored;
  const legacy = window.localStorage.getItem(LEGACY_TERMINAL_SIZE_KEY);
  const parsedLegacy = parseTerminalSize(legacy);
  if (parsedLegacy) {
    window.localStorage.removeItem(LEGACY_TERMINAL_SIZE_KEY);
    window.localStorage.setItem(TERMINAL_SIZE_KEY, JSON.stringify(parsedLegacy));
    return parsedLegacy;
  }
  return { ...DEFAULT_SETTINGS.terminalSize };
}

export async function setTerminalSize(size) {
  if (typeof window === 'undefined') return;
  const parsed = parseTerminalSize(size);
  if (!parsed) {
    window.localStorage.removeItem(TERMINAL_SIZE_KEY);
    return;
  }
  window.localStorage.setItem(TERMINAL_SIZE_KEY, JSON.stringify(parsed));
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
  window.localStorage.removeItem(TERMINAL_FONT_SCALE_KEY);
  window.localStorage.removeItem(TERMINAL_THEME_KEY);
  window.localStorage.removeItem(TERMINAL_SIZE_KEY);
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
    allowNetwork,
    haptics,
    terminalFontScale,
    terminalTheme,
    terminalSize,
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
    getTerminalFontScale(),
    getTerminalTheme(),
    getTerminalSize(),
  ]);
  const theme = getTheme();
  return JSON.stringify({
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
    terminalFontScale,
    terminalTheme,
    terminalSize,
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
    terminalFontScale,
    terminalTheme,
    terminalSize,
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
  if (terminalFontScale !== undefined)
    await setTerminalFontScale(terminalFontScale);
  if (terminalTheme !== undefined) await setTerminalTheme(terminalTheme);
  if (terminalSize !== undefined) await setTerminalSize(terminalSize);
}

export const defaults = DEFAULT_SETTINGS;
