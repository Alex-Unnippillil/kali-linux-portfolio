"use client";

import { get, set, del } from 'idb-keyval';
import { safeLocalStorage } from './safeStorage';
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
  panelPosition: 'bottom',
  panelSize: 40,
  panelOpacity: 0.5,
  panelAutohide: false,
  workspaceCount: 4,
  workspaceNames: ['Desktop 1', 'Desktop 2', 'Desktop 3', 'Desktop 4'],
};

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  const localValue = safeLocalStorage?.getItem('accent');
  if (localValue) return localValue;
  try {
    const idbValue = await get('accent');
    if (idbValue) {
      safeLocalStorage?.setItem('accent', idbValue);
      return idbValue;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('accent', accent);
  try {
    await set('accent', accent);
  } catch {
    /* ignore */
  }
}

export async function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  const localValue = safeLocalStorage?.getItem('bg-image');
  if (localValue) return localValue;
  try {
    const idbValue = await get('bg-image');
    if (idbValue) {
      safeLocalStorage?.setItem('bg-image', idbValue);
      return idbValue;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('bg-image', wallpaper);
  try {
    await set('bg-image', wallpaper);
  } catch {
    /* ignore */
  }
}

export async function getDensity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return safeLocalStorage?.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = safeLocalStorage?.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = safeLocalStorage?.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return safeLocalStorage?.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return safeLocalStorage?.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = safeLocalStorage?.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = safeLocalStorage?.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return safeLocalStorage?.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('allow-network', value ? 'true' : 'false');
}

export async function getPanelPosition() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.panelPosition;
  return (
    safeLocalStorage?.getItem('panel-position') || DEFAULT_SETTINGS.panelPosition
  );
}

export async function setPanelPosition(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('panel-position', value);
}

export async function getPanelSize() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.panelSize;
  const stored = safeLocalStorage?.getItem('panel-size');
  return stored ? parseInt(stored, 10) : DEFAULT_SETTINGS.panelSize;
}

export async function setPanelSize(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('panel-size', String(value));
}

export async function getPanelOpacity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.panelOpacity;
  const stored = safeLocalStorage?.getItem('panel-opacity');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.panelOpacity;
}

export async function setPanelOpacity(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('panel-opacity', String(value));
}

export async function getPanelAutohide() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.panelAutohide;
  return safeLocalStorage?.getItem('panel-autohide') === 'true';
}

export async function setPanelAutohide(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('panel-autohide', value ? 'true' : 'false');
}

export async function getWorkspaceCount() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.workspaceCount;
  const stored = safeLocalStorage?.getItem('workspace-count');
  return stored ? parseInt(stored, 10) : DEFAULT_SETTINGS.workspaceCount;
}

export async function setWorkspaceCount(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('workspace-count', String(value));
}

export async function getWorkspaceNames() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.workspaceNames;
  try {
    const stored = safeLocalStorage?.getItem('workspace-names');
    if (!stored) return DEFAULT_SETTINGS.workspaceNames;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_SETTINGS.workspaceNames;
  } catch {
    return DEFAULT_SETTINGS.workspaceNames;
  }
}

export async function setWorkspaceNames(value) {
  if (typeof window === 'undefined') return;
  safeLocalStorage?.setItem('workspace-names', JSON.stringify(value));
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  safeLocalStorage?.removeItem('density');
  safeLocalStorage?.removeItem('reduced-motion');
  safeLocalStorage?.removeItem('font-scale');
  safeLocalStorage?.removeItem('high-contrast');
  safeLocalStorage?.removeItem('large-hit-areas');
  safeLocalStorage?.removeItem('pong-spin');
  safeLocalStorage?.removeItem('allow-network');
  safeLocalStorage?.removeItem('haptics');
  safeLocalStorage?.removeItem('panel-position');
  safeLocalStorage?.removeItem('panel-size');
  safeLocalStorage?.removeItem('panel-opacity');
  safeLocalStorage?.removeItem('panel-autohide');
  safeLocalStorage?.removeItem('workspace-count');
  safeLocalStorage?.removeItem('workspace-names');
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
    panelPosition,
    panelSize,
    panelOpacity,
    panelAutohide,
    workspaceCount,
    workspaceNames,
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
    getPanelPosition(),
    getPanelSize(),
    getPanelOpacity(),
    getPanelAutohide(),
    getWorkspaceCount(),
    getWorkspaceNames(),
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
    panelPosition,
    panelSize,
    panelOpacity,
    panelAutohide,
    workspaceCount,
    workspaceNames,
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
    panelPosition,
    panelSize,
    panelOpacity,
    panelAutohide,
    workspaceCount,
    workspaceNames,
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
  if (panelPosition !== undefined) await setPanelPosition(panelPosition);
  if (panelSize !== undefined) await setPanelSize(panelSize);
  if (panelOpacity !== undefined) await setPanelOpacity(panelOpacity);
  if (panelAutohide !== undefined) await setPanelAutohide(panelAutohide);
  if (workspaceCount !== undefined) await setWorkspaceCount(workspaceCount);
  if (workspaceNames !== undefined) await setWorkspaceNames(workspaceNames);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
