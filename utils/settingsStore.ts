"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

interface Settings {
  accent: string;
  wallpaper: string;
  density: string;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

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

export async function getAccent(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getDensity(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density: string): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale(): Promise<number> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale: number): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value: boolean): Promise<void> {
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

export type ExportChannel = 'appearance' | 'panel';

export async function exportSettings(channel: ExportChannel = 'appearance'): Promise<string> {
  if (channel === 'panel') {
    if (typeof window === 'undefined') {
      return '<?xml version="1.0" encoding="UTF-8"?>\n<channel name="xfce4-panel" version="1.0"></channel>';
    }
    const size = window.localStorage.getItem('xfce.panel.size') || '24';
    const length = window.localStorage.getItem('xfce.panel.length') || '100';
    const orientation =
      window.localStorage.getItem('xfce.panel.orientation') || 'horizontal';
    const autohide = window.localStorage.getItem('xfce.panel.autohide') === 'true';
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<channel name="xfce4-panel" version="1.0">',
      `  <property name="size" type="int" value="${size}"/>`,
      `  <property name="length" type="int" value="${length}"/>`,
      `  <property name="orientation" type="string" value="${orientation}"/>`,
      `  <property name="autohide" type="bool" value="${autohide}"/>`,
      '</channel>',
    ];
    return lines.join('\n');
  }

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
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<channel name="xsettings" version="1.0">',
    `  <property name="theme" type="string" value="${theme}"/>`,
    `  <property name="accent" type="string" value="${accent}"/>`,
    `  <property name="wallpaper" type="string" value="${wallpaper}"/>`,
    `  <property name="density" type="string" value="${density}"/>`,
    `  <property name="reducedMotion" type="bool" value="${reducedMotion}"/>`,
    `  <property name="fontScale" type="double" value="${fontScale}"/>`,
    `  <property name="highContrast" type="bool" value="${highContrast}"/>`,
    `  <property name="largeHitAreas" type="bool" value="${largeHitAreas}"/>`,
    `  <property name="pongSpin" type="bool" value="${pongSpin}"/>`,
    `  <property name="allowNetwork" type="bool" value="${allowNetwork}"/>`,
    `  <property name="haptics" type="bool" value="${haptics}"/>`,
    '</channel>',
  ];
  return lines.join('\n');
}

export async function importSettings(json: string | object): Promise<void> {
  if (typeof window === 'undefined') return;
  let settings: any;
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
  } = settings as Partial<Settings> & { theme?: string };
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
}

export const defaults = DEFAULT_SETTINGS;

