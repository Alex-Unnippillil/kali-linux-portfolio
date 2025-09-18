import {
  getAccent,
  setAccent,
  getWallpaper,
  setWallpaper,
  getDensity,
  setDensity,
  getReducedMotion,
  setReducedMotion,
  getFontScale,
  setFontScale,
  getHighContrast,
  setHighContrast,
  getLargeHitAreas,
  setLargeHitAreas,
  getPongSpin,
  setPongSpin,
  getAllowNetwork,
  setAllowNetwork,
  getHaptics,
  setHaptics,
  defaults,
} from '../settingsStore';
import { getTheme, setTheme } from '../theme';

export type SettingsDensity = 'regular' | 'compact';

export interface SettingsSnapshot {
  accent: string;
  wallpaper: string;
  density: SettingsDensity;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
}

export const SETTINGS_KEYS: (keyof SettingsSnapshot)[] = [
  'accent',
  'wallpaper',
  'density',
  'reducedMotion',
  'fontScale',
  'highContrast',
  'largeHitAreas',
  'pongSpin',
  'allowNetwork',
  'haptics',
  'theme',
];

export const loadSettingsSnapshot = async (): Promise<SettingsSnapshot> => {
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

  return {
    accent,
    wallpaper,
    density: density as SettingsDensity,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme: getTheme(),
  };
};

export const persistSettingsSnapshot = async (
  snapshot: SettingsSnapshot,
): Promise<void> => {
  await Promise.all([
    Promise.resolve(setAccent(snapshot.accent)),
    Promise.resolve(setWallpaper(snapshot.wallpaper)),
    Promise.resolve(setDensity(snapshot.density)),
    Promise.resolve(setReducedMotion(snapshot.reducedMotion)),
    Promise.resolve(setFontScale(snapshot.fontScale)),
    Promise.resolve(setHighContrast(snapshot.highContrast)),
    Promise.resolve(setLargeHitAreas(snapshot.largeHitAreas)),
    Promise.resolve(setPongSpin(snapshot.pongSpin)),
    Promise.resolve(setAllowNetwork(snapshot.allowNetwork)),
    Promise.resolve(setHaptics(snapshot.haptics)),
  ]);
  setTheme(snapshot.theme);
};

export const diffSettings = (
  previous: SettingsSnapshot,
  next: SettingsSnapshot,
): Partial<SettingsSnapshot> => {
  const diff: Partial<SettingsSnapshot> = {};
  for (const key of SETTINGS_KEYS) {
    if (previous[key] !== next[key]) {
      diff[key] = next[key];
    }
  }
  return diff;
};

export const cloneSnapshot = (
  snapshot: SettingsSnapshot,
): SettingsSnapshot => ({ ...snapshot });

export const defaultSnapshot: SettingsSnapshot = {
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as SettingsDensity,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: getTheme(),
};
