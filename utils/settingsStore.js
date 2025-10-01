"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';
import {
  DEFAULT_QUICK_ACTION_STATE,
  QUICK_ACTION_IDS,
  isValidQuickActionId,
} from './quickActionsConfig';

const hasDOM = () =>
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  window.document !== null;

const DEFAULT_SETTINGS = {
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
  quickActions: DEFAULT_QUICK_ACTION_STATE.map((action) => ({ ...action })),
};

const QUICK_ACTIONS_STORAGE_KEY = 'quick-actions';

const normaliseQuickActions = (value) => {
  const defaults = DEFAULT_SETTINGS.quickActions;
  if (!Array.isArray(value)) {
    return defaults.map((item) => ({ ...item }));
  }
  const seen = new Set();
  const sanitised = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const { id, visible } = item;
    if (!isValidQuickActionId(id) || seen.has(id)) return;
    sanitised.push({ id, visible: Boolean(visible) });
    seen.add(id);
  });
  QUICK_ACTION_IDS.forEach((id) => {
    if (seen.has(id)) return;
    const fallback = defaults.find((item) => item.id === id) || { visible: true };
    sanitised.push({ id, visible: Boolean(fallback.visible) });
    seen.add(id);
  });
  return sanitised;
};

export async function getAccent() {
  if (!hasDOM()) return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (!hasDOM()) return;
  await set('accent', accent);
}

export async function getWallpaper() {
  if (!hasDOM()) return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (!hasDOM()) return;
  await set('bg-image', wallpaper);
}

export async function getUseKaliWallpaper() {
  if (!hasDOM()) return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = window.localStorage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
}

export async function getDensity() {
  if (!hasDOM()) return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (!hasDOM()) return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (!hasDOM()) return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (!hasDOM()) return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (!hasDOM()) return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (!hasDOM()) return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (!hasDOM()) return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (!hasDOM()) return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getQuickActions() {
  if (!hasDOM()) {
    return DEFAULT_SETTINGS.quickActions.map((item) => ({ ...item }));
  }
  try {
    const stored = window.localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS.quickActions.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(stored);
    return normaliseQuickActions(parsed);
  } catch {
    return DEFAULT_SETTINGS.quickActions.map((item) => ({ ...item }));
  }
}

export async function setQuickActions(value) {
  if (!hasDOM()) return;
  const sanitised = normaliseQuickActions(value);
  try {
    window.localStorage.setItem(
      QUICK_ACTIONS_STORAGE_KEY,
      JSON.stringify(sanitised),
    );
  } catch {
    // ignore persistence errors
  }
}

export async function getPongSpin() {
  if (!hasDOM()) return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (!hasDOM()) return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (!hasDOM()) return;
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (!hasDOM()) return;
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
  window.localStorage.removeItem('use-kali-wallpaper');
  window.localStorage.removeItem(QUICK_ACTIONS_STORAGE_KEY);
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    quickActions,
  ] = await Promise.all([
    getAccent(),
    getWallpaper(),
    getUseKaliWallpaper(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
    getQuickActions(),
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
    useKaliWallpaper,
    theme,
    quickActions,
  });
}

export async function importSettings(json) {
  if (!hasDOM()) return;
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
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
    quickActions,
  } = settings;
  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (useKaliWallpaper !== undefined) await setUseKaliWallpaper(useKaliWallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
  if (quickActions !== undefined) await setQuickActions(quickActions);
}

export const defaults = DEFAULT_SETTINGS;
