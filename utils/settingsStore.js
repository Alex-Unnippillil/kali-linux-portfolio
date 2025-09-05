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
  tapToClick: false,
  disableWhileTyping: true,
  naturalScroll: false,
  mouseSpeed: 50,
  touchpadSpeed: 50,
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

export async function getTapToClick() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.tapToClick;
  const val = window.localStorage.getItem('tap-to-click');
  return val === null ? DEFAULT_SETTINGS.tapToClick : val === 'true';
}

export async function setTapToClick(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('tap-to-click', value ? 'true' : 'false');
}

export async function getDisableWhileTyping() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.disableWhileTyping;
  const val = window.localStorage.getItem('disable-while-typing');
  return val === null ? DEFAULT_SETTINGS.disableWhileTyping : val === 'true';
}

export async function setDisableWhileTyping(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('disable-while-typing', value ? 'true' : 'false');
}

export async function getNaturalScroll() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.naturalScroll;
  const val = window.localStorage.getItem('natural-scroll');
  return val === null ? DEFAULT_SETTINGS.naturalScroll : val === 'true';
}

export async function setNaturalScroll(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('natural-scroll', value ? 'true' : 'false');
}

export async function getMouseSpeed() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.mouseSpeed;
  const val = window.localStorage.getItem('mouse-speed');
  return val === null ? DEFAULT_SETTINGS.mouseSpeed : parseInt(val, 10);
}

export async function setMouseSpeed(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('mouse-speed', String(value));
}

export async function getTouchpadSpeed() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.touchpadSpeed;
  const val = window.localStorage.getItem('touchpad-speed');
  return val === null ? DEFAULT_SETTINGS.touchpadSpeed : parseInt(val, 10);
}

export async function setTouchpadSpeed(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('touchpad-speed', String(value));
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
  window.localStorage.removeItem('tap-to-click');
  window.localStorage.removeItem('disable-while-typing');
  window.localStorage.removeItem('natural-scroll');
  window.localStorage.removeItem('mouse-speed');
  window.localStorage.removeItem('touchpad-speed');
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
    tapToClick,
    disableWhileTyping,
    naturalScroll,
    mouseSpeed,
    touchpadSpeed,
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
    getTapToClick(),
    getDisableWhileTyping(),
    getNaturalScroll(),
    getMouseSpeed(),
    getTouchpadSpeed(),
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
    tapToClick,
    disableWhileTyping,
    naturalScroll,
    mouseSpeed,
    touchpadSpeed,
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
    tapToClick,
    disableWhileTyping,
    naturalScroll,
    mouseSpeed,
    touchpadSpeed,
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
  if (tapToClick !== undefined) await setTapToClick(tapToClick);
  if (disableWhileTyping !== undefined)
    await setDisableWhileTyping(disableWhileTyping);
  if (naturalScroll !== undefined) await setNaturalScroll(naturalScroll);
  if (mouseSpeed !== undefined) await setMouseSpeed(mouseSpeed);
  if (touchpadSpeed !== undefined) await setTouchpadSpeed(touchpadSpeed);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
