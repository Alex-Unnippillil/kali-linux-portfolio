import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';
import { isBrowser } from './isBrowser';

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
};

export async function getAccent() {
  if (!isBrowser) return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (!isBrowser) return;
  await set('accent', accent);
}

export async function getWallpaper() {
  if (!isBrowser) return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (!isBrowser) return;
  await set('bg-image', wallpaper);
}

export async function getDensity() {
  if (!isBrowser) return DEFAULT_SETTINGS.density;
  return globalThis.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (!isBrowser) return DEFAULT_SETTINGS.reducedMotion;
  return globalThis.localStorage.getItem('reduced-motion') === 'true';
}

export async function setReducedMotion(value) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (!isBrowser) return DEFAULT_SETTINGS.fontScale;
  const stored = globalThis.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (!isBrowser) return DEFAULT_SETTINGS.highContrast;
  return globalThis.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (!isBrowser) return DEFAULT_SETTINGS.largeHitAreas;
  return globalThis.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (!isBrowser) return DEFAULT_SETTINGS.pongSpin;
  const val = globalThis.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (!isBrowser) return DEFAULT_SETTINGS.allowNetwork;
  return globalThis.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (!isBrowser) return;
  globalThis.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (!isBrowser) return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  globalThis.localStorage.removeItem('density');
  globalThis.localStorage.removeItem('reduced-motion');
  globalThis.localStorage.removeItem('font-scale');
  globalThis.localStorage.removeItem('high-contrast');
  globalThis.localStorage.removeItem('large-hit-areas');
  globalThis.localStorage.removeItem('pong-spin');
  globalThis.localStorage.removeItem('allow-network');
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
    theme,
  });
}

export async function importSettings(json) {
  if (!isBrowser) return;
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
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
