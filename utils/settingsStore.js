"use client";

import { isBrowser } from '@/utils/env';
import { getTheme, setTheme } from './theme';
import { safeLocalStorage } from './safeStorage';

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'cozy',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
  networkTime: false,
  symbolicTrayIcons: false,
};

export async function getAccent() {
  if (!isBrowser()) return DEFAULT_SETTINGS.accent;
  const stored = window.localStorage.getItem('accent');
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (!isBrowser()) return;
  window.localStorage.setItem('accent', JSON.stringify(accent));
}

export async function getWallpaper() {
  if (!isBrowser()) return DEFAULT_SETTINGS.wallpaper;
  const stored = window.localStorage.getItem('bg-image');
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (!isBrowser()) return;
  window.localStorage.setItem('bg-image', JSON.stringify(wallpaper));
}

export async function getDensity() {
  if (!isBrowser()) return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (!isBrowser()) return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (!isBrowser()) return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (!isBrowser()) return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (!isBrowser()) return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (!isBrowser()) return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (!isBrowser()) return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (!isBrowser()) return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (!isBrowser()) return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (!isBrowser()) return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function getNetworkTime() {
  if (!isBrowser()) return DEFAULT_SETTINGS.networkTime;
  return window.localStorage.getItem('network-time') === 'true';
}

export async function setNetworkTime(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('network-time', value ? 'true' : 'false');
}

export async function getSymbolicTrayIcons() {
  if (!isBrowser()) return DEFAULT_SETTINGS.symbolicTrayIcons;
  return window.localStorage.getItem('symbolic-tray-icons') === 'true';
}

export async function setSymbolicTrayIcons(value) {
  if (!isBrowser()) return;
  window.localStorage.setItem('symbolic-tray-icons', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (!isBrowser()) return;
  window.localStorage.removeItem('accent');
  window.localStorage.removeItem('bg-image');
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
  window.localStorage.removeItem('network-time');
  window.localStorage.removeItem('symbolic-tray-icons');
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
    networkTime,
    symbolicTrayIcons,
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
    getNetworkTime(),
    getSymbolicTrayIcons(),
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
    networkTime,
    symbolicTrayIcons,
    theme,
  });
}

export async function importSettings(json) {
  if (!isBrowser()) return;
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
    networkTime,
    symbolicTrayIcons,
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
  if (networkTime !== undefined) await setNetworkTime(networkTime);
  if (symbolicTrayIcons !== undefined) await setSymbolicTrayIcons(symbolicTrayIcons);
  if (theme !== undefined) setTheme(theme);
}

export async function exportPanel() {
  if (!isBrowser()) return JSON.stringify({ pinnedApps: [], panelSize: 16 });
  let pinnedApps = [];
  try {
    pinnedApps = JSON.parse(safeLocalStorage?.getItem('pinnedApps') || '[]');
  } catch {
    pinnedApps = [];
  }
  let panelSize = 16;
  try {
    const stored = window.localStorage.getItem('app:panel-icons');
    panelSize = stored ? JSON.parse(stored) : 16;
  } catch {
    panelSize = 16;
  }
  return JSON.stringify({ pinnedApps, panelSize });
}

export async function importPanel(json) {
  if (!isBrowser()) return;
  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    console.error('Invalid panel settings', e);
    return;
  }
  const { pinnedApps, panelSize } = data;
  if (Array.isArray(pinnedApps)) {
    safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps));
    try {
      const sessionRaw = window.localStorage.getItem('desktop-session');
      const session = sessionRaw ? JSON.parse(sessionRaw) : {};
      session.dock = pinnedApps;
      window.localStorage.setItem('desktop-session', JSON.stringify(session));
    } catch {
      // ignore
    }
  }
  if (panelSize !== undefined) {
    try {
      window.localStorage.setItem('app:panel-icons', JSON.stringify(panelSize));
    } catch {
      // ignore
    }
  }
}

export const defaults = DEFAULT_SETTINGS;
