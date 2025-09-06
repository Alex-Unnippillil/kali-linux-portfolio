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
  showDesktopIcons: true,
  desktopIconSize: 1,
  desktopLabelPosition: 'bottom',
  alignToGrid: true,
  autoArrange: true,
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

export async function getShowDesktopIcons() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.showDesktopIcons;
  try {
    const val = window.localStorage.getItem('show-desktop-icons');
    return val === null ? DEFAULT_SETTINGS.showDesktopIcons : val === 'true';
  } catch {
    return DEFAULT_SETTINGS.showDesktopIcons;
  }
}

export async function setShowDesktopIcons(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('show-desktop-icons', value ? 'true' : 'false');
}

export async function getDesktopIconSize() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.desktopIconSize;
  try {
    const stored = window.localStorage.getItem('desktop-icon-size');
    return stored ? parseFloat(stored) : DEFAULT_SETTINGS.desktopIconSize;
  } catch {
    return DEFAULT_SETTINGS.desktopIconSize;
  }
}

export async function setDesktopIconSize(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('desktop-icon-size', String(value));
}

export async function getDesktopLabelPosition() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.desktopLabelPosition;
  try {
    return (
      window.localStorage.getItem('desktop-label-position') ||
      DEFAULT_SETTINGS.desktopLabelPosition
    );
  } catch {
    return DEFAULT_SETTINGS.desktopLabelPosition;
  }
}

export async function setDesktopLabelPosition(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('desktop-label-position', value);
}

export async function getAlignToGrid() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.alignToGrid;
  try {
    const val = window.localStorage.getItem('align-to-grid');
    return val === null ? DEFAULT_SETTINGS.alignToGrid : val === 'true';
  } catch {
    return DEFAULT_SETTINGS.alignToGrid;
  }
}

export async function setAlignToGrid(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('align-to-grid', value ? 'true' : 'false');
}

export async function getAutoArrange() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.autoArrange;
  try {
    const val = window.localStorage.getItem('auto-arrange');
    return val === null ? DEFAULT_SETTINGS.autoArrange : val === 'true';
  } catch {
    return DEFAULT_SETTINGS.autoArrange;
  }
}

export async function setAutoArrange(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('auto-arrange', value ? 'true' : 'false');
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
  window.localStorage.removeItem('show-desktop-icons');
  window.localStorage.removeItem('desktop-icon-size');
  window.localStorage.removeItem('desktop-label-position');
  window.localStorage.removeItem('align-to-grid');
  window.localStorage.removeItem('auto-arrange');
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
    showDesktopIcons,
    desktopIconSize,
    desktopLabelPosition,
    alignToGrid,
    autoArrange,
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
    getShowDesktopIcons(),
    getDesktopIconSize(),
    getDesktopLabelPosition(),
    getAlignToGrid(),
    getAutoArrange(),
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
    showDesktopIcons,
    desktopIconSize,
    desktopLabelPosition,
    alignToGrid,
    autoArrange,
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
    showDesktopIcons,
    desktopIconSize,
    desktopLabelPosition,
    alignToGrid,
    autoArrange,
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
  if (showDesktopIcons !== undefined) await setShowDesktopIcons(showDesktopIcons);
  if (desktopIconSize !== undefined) await setDesktopIconSize(desktopIconSize);
  if (desktopLabelPosition !== undefined)
    await setDesktopLabelPosition(desktopLabelPosition);
  if (alignToGrid !== undefined) await setAlignToGrid(alignToGrid);
  if (autoArrange !== undefined) await setAutoArrange(autoArrange);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
