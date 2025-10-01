"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const DEFAULT_STATUS_BAR_LAYOUT = {
  left: ['mode'],
  center: ['tips'],
  right: ['network', 'clock'],
};

const DEFAULT_STATUS_BAR_VISIBILITY = {
  mode: true,
  tips: true,
  network: true,
  clock: true,
};

const DEFAULT_TIP_STATE = {
  pinned: null,
  dismissed: [],
};

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
  statusBarLayout: DEFAULT_STATUS_BAR_LAYOUT,
  statusBarVisibility: DEFAULT_STATUS_BAR_VISIBILITY,
  statusBarPinnedTip: DEFAULT_TIP_STATE.pinned,
  statusBarDismissedTips: DEFAULT_TIP_STATE.dismissed,
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

export async function getUseKaliWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = window.localStorage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
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

const parseJSON = (value, fallback) => {
  if (!value) return clone(fallback);
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return clone(fallback);
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse settings payload', error);
    return clone(fallback);
  }
};

const validateLayout = (layout) => {
  if (typeof layout !== 'object' || layout === null) {
    return clone(DEFAULT_STATUS_BAR_LAYOUT);
  }
  const result = {
    left: Array.isArray(layout.left) ? layout.left.slice() : [],
    center: Array.isArray(layout.center) ? layout.center.slice() : [],
    right: Array.isArray(layout.right) ? layout.right.slice() : [],
  };
  const seen = new Set();
  const all = ['mode', 'tips', 'network', 'clock'];
  Object.keys(result).forEach((key) => {
    result[key] = result[key].filter((module) => {
      if (!all.includes(module)) return false;
      if (seen.has(module)) return false;
      seen.add(module);
      return true;
    });
  });
  all.forEach((module) => {
    if (!seen.has(module)) {
      result.right.push(module);
      seen.add(module);
    }
  });
  return result;
};

const validateVisibility = (visibility) => {
  const modules = ['mode', 'tips', 'network', 'clock'];
  const result = {};
  modules.forEach((module) => {
    if (visibility && typeof visibility === 'object' && module in visibility) {
      result[module] = Boolean(visibility[module]);
    } else {
      result[module] = DEFAULT_STATUS_BAR_VISIBILITY[module];
    }
  });
  return result;
};

export async function getStatusBarLayout() {
  if (typeof window === 'undefined') return clone(DEFAULT_STATUS_BAR_LAYOUT);
  const stored = window.localStorage.getItem('status-bar:layout');
  return validateLayout(parseJSON(stored, DEFAULT_STATUS_BAR_LAYOUT));
}

export async function setStatusBarLayout(layout) {
  if (typeof window === 'undefined') return;
  const next = validateLayout(layout);
  window.localStorage.setItem('status-bar:layout', JSON.stringify(next));
}

export async function getStatusBarVisibility() {
  if (typeof window === 'undefined') return clone(DEFAULT_STATUS_BAR_VISIBILITY);
  const stored = window.localStorage.getItem('status-bar:visibility');
  return validateVisibility(parseJSON(stored, DEFAULT_STATUS_BAR_VISIBILITY));
}

export async function setStatusBarVisibility(visibility) {
  if (typeof window === 'undefined') return;
  const next = validateVisibility(visibility);
  window.localStorage.setItem('status-bar:visibility', JSON.stringify(next));
}

export async function getPinnedStatusBarTip() {
  if (typeof window === 'undefined') return DEFAULT_TIP_STATE.pinned;
  const stored = window.localStorage.getItem('status-bar:pinned-tip');
  return stored || DEFAULT_TIP_STATE.pinned;
}

export async function setPinnedStatusBarTip(tipId) {
  if (typeof window === 'undefined') return;
  if (!tipId) {
    window.localStorage.removeItem('status-bar:pinned-tip');
    return;
  }
  window.localStorage.setItem('status-bar:pinned-tip', tipId);
}

export async function getDismissedStatusBarTips() {
  if (typeof window === 'undefined') return clone(DEFAULT_TIP_STATE.dismissed);
  const stored = window.localStorage.getItem('status-bar:dismissed-tips');
  const parsed = parseJSON(stored, DEFAULT_TIP_STATE.dismissed);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((tip) => typeof tip === 'string');
}

export async function setDismissedStatusBarTips(tips) {
  if (typeof window === 'undefined') return;
  const list = Array.isArray(tips) ? tips.filter((tip) => typeof tip === 'string') : [];
  window.localStorage.setItem('status-bar:dismissed-tips', JSON.stringify(Array.from(new Set(list))));
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
  window.localStorage.removeItem('use-kali-wallpaper');
  window.localStorage.removeItem('status-bar:layout');
  window.localStorage.removeItem('status-bar:visibility');
  window.localStorage.removeItem('status-bar:pinned-tip');
  window.localStorage.removeItem('status-bar:dismissed-tips');
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
    statusBarLayout,
    statusBarVisibility,
    statusBarPinnedTip,
    statusBarDismissedTips,
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
    getStatusBarLayout(),
    getStatusBarVisibility(),
    getPinnedStatusBarTip(),
    getDismissedStatusBarTips(),
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
    statusBarLayout,
    statusBarVisibility,
    statusBarPinnedTip,
    statusBarDismissedTips,
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
    statusBarLayout,
    statusBarVisibility,
    statusBarPinnedTip,
    statusBarDismissedTips,
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
  if (statusBarLayout !== undefined) await setStatusBarLayout(statusBarLayout);
  if (statusBarVisibility !== undefined) await setStatusBarVisibility(statusBarVisibility);
  if (statusBarPinnedTip !== undefined) await setPinnedStatusBarTip(statusBarPinnedTip);
  if (statusBarDismissedTips !== undefined)
    await setDismissedStatusBarTips(statusBarDismissedTips);
}

export const defaults = DEFAULT_SETTINGS;
