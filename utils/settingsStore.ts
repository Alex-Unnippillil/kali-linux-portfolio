"use client";

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { getTheme } from './theme';

export type Density = 'regular' | 'compact';

export interface SettingsValues {
  accent: string;
  wallpaper: string;
  useKaliWallpaper: boolean;
  density: Density;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
}

const DEFAULT_SETTINGS: SettingsValues = {
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
  theme: 'default',
};

let hasLoggedStorageWarning = false;

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && !hasLoggedStorageWarning) {
      // eslint-disable-next-line no-console
      console.warn(
        'Local storage is not available; falling back to default settings.',
        error,
      );
      hasLoggedStorageWarning = true;
    }
    return null;
  }
};

const storage: StateStorage = {
  getItem: (name) => getStorage()?.getItem(name) ?? null,
  setItem: (name, value) => {
    const store = getStorage();
    if (store) store.setItem(name, value);
  },
  removeItem: (name) => {
    const store = getStorage();
    if (store) store.removeItem(name);
  },
};

const getPreferredReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return DEFAULT_SETTINGS.reducedMotion;
};

const resolveDefaults = (useStoredTheme = true): SettingsValues => ({
  ...DEFAULT_SETTINGS,
  reducedMotion: getPreferredReducedMotion(),
  theme: useStoredTheme ? getTheme() : DEFAULT_SETTINGS.theme,
});

export interface SettingsState extends SettingsValues {
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setUseKaliWallpaper: (value: boolean) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (scale: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setTheme: (value: string) => void;
  reset: () => void;
  hasHydrated: boolean;
}

const pickSettings = (state: SettingsValues) => ({
  accent: state.accent,
  wallpaper: state.wallpaper,
  useKaliWallpaper: state.useKaliWallpaper,
  density: state.density,
  reducedMotion: state.reducedMotion,
  fontScale: state.fontScale,
  highContrast: state.highContrast,
  largeHitAreas: state.largeHitAreas,
  pongSpin: state.pongSpin,
  allowNetwork: state.allowNetwork,
  haptics: state.haptics,
  theme: state.theme,
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...resolveDefaults(),
      hasHydrated: false,
      setAccent: (accent) => set({ accent }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setUseKaliWallpaper: (useKaliWallpaper) => set({ useKaliWallpaper }),
      setDensity: (density) => set({ density }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setFontScale: (fontScale) => set({ fontScale }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setLargeHitAreas: (largeHitAreas) => set({ largeHitAreas }),
      setPongSpin: (pongSpin) => set({ pongSpin }),
      setAllowNetwork: (allowNetwork) => set({ allowNetwork }),
      setHaptics: (haptics) => set({ haptics }),
      setTheme: (theme) => set({ theme }),
      reset: () => {
        const resolvedDefaults = resolveDefaults(false);
        set(resolvedDefaults);
      },
    }),
    {
      name: 'desktop-settings',
      storage: createJSONStorage(() => storage),
      partialize: (state) => pickSettings(state),
      onRehydrateStorage: () => (state) => {
        state.hasHydrated = true;
      },
    },
  ),
);

export const defaults = DEFAULT_SETTINGS;

export async function resetSettings(): Promise<void> {
  useSettingsStore.getState().reset();
  await useSettingsStore.persist.clearStorage();
}

export async function exportSettings(): Promise<string> {
  const state = useSettingsStore.getState();
  return JSON.stringify(pickSettings(state));
}

export async function importSettings(
  json: string | Partial<SettingsValues>,
): Promise<void> {
  if (typeof window === 'undefined') return;
  let settings: Partial<SettingsValues>;
  try {
    settings = typeof json === 'string' ? (JSON.parse(json) as Partial<SettingsValues>) : json;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Invalid settings', error);
    return;
  }
  const updates: Partial<SettingsValues> = {};
  const applySetting = <K extends keyof SettingsValues>(
    key: K,
    value: SettingsValues[K] | undefined,
  ) => {
    if (value !== undefined) updates[key] = value;
  };

  applySetting('accent', settings.accent);
  applySetting('wallpaper', settings.wallpaper);
  applySetting('useKaliWallpaper', settings.useKaliWallpaper);
  applySetting('density', settings.density);
  applySetting('reducedMotion', settings.reducedMotion);
  applySetting('fontScale', settings.fontScale);
  applySetting('highContrast', settings.highContrast);
  applySetting('largeHitAreas', settings.largeHitAreas);
  applySetting('pongSpin', settings.pongSpin);
  applySetting('allowNetwork', settings.allowNetwork);
  applySetting('haptics', settings.haptics);
  applySetting('theme', settings.theme);

  if (Object.keys(updates).length > 0) {
    useSettingsStore.setState((state) => ({ ...state, ...updates }));
  }
}
