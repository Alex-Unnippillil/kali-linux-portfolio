export type DensitySetting = 'regular' | 'compact';

export interface AppearanceSettings {
  theme: string;
  accent: string;
  wallpaper: string;
  density: DensitySetting;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

export interface AppearanceOptions {
  themes: string[];
  accents: string[];
  wallpapers: string[];
  densities: DensitySetting[];
}

export interface AppearancePayload {
  settings: AppearanceSettings;
  options: AppearanceOptions;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'default',
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

export const APPEARANCE_OPTIONS: AppearanceOptions = {
  themes: ['default', 'dark', 'neon', 'matrix'],
  accents: ['#1793d1', '#e53e3e', '#d97706', '#38a169', '#805ad5', '#ed64a6'],
  wallpapers: [
    'wall-1',
    'wall-2',
    'wall-3',
    'wall-4',
    'wall-5',
    'wall-6',
    'wall-7',
    'wall-8',
  ],
  densities: ['regular', 'compact'],
};

const STORE_SYMBOL = Symbol.for('kali-linux-portfolio.appearance');

interface AppearanceStore {
  settings: AppearanceSettings;
}

function ensureStore(): AppearanceStore {
  const globalSymbols = Object.getOwnPropertySymbols(globalThis);
  if (!globalSymbols.includes(STORE_SYMBOL)) {
    (globalThis as any)[STORE_SYMBOL] = {
      settings: { ...DEFAULT_APPEARANCE },
    } satisfies AppearanceStore;
  }
  return (globalThis as any)[STORE_SYMBOL] as AppearanceStore;
}

export function readAppearanceSettings(): AppearanceSettings {
  const store = ensureStore();
  return { ...store.settings };
}

export function writeAppearanceSettings(update: Partial<AppearanceSettings>): AppearanceSettings {
  const store = ensureStore();
  store.settings = { ...store.settings, ...update };
  return { ...store.settings };
}

const BOOLEAN_KEYS: (keyof AppearanceSettings)[] = [
  'reducedMotion',
  'highContrast',
  'largeHitAreas',
  'pongSpin',
  'allowNetwork',
  'haptics',
];

export function parseAppearanceUpdate(input: unknown): Partial<AppearanceSettings> | null {
  if (!input || typeof input !== 'object') return null;

  const base =
    'settings' in (input as Record<string, unknown>) &&
    (input as Record<string, unknown>).settings &&
    typeof (input as Record<string, unknown>).settings === 'object' &&
    !Array.isArray((input as Record<string, unknown>).settings)
      ? (input as Record<string, unknown>).settings
      : input;

  if (!base || typeof base !== 'object' || Array.isArray(base)) return null;

  const record = base as Record<string, unknown>;
  const next: Partial<AppearanceSettings> = {};

  if (typeof record.theme === 'string') {
    next.theme = record.theme;
  }

  if (typeof record.accent === 'string') {
    next.accent = record.accent;
  }

  if (typeof record.wallpaper === 'string') {
    next.wallpaper = record.wallpaper;
  }

  if (
    typeof record.density === 'string' &&
    (record.density === 'regular' || record.density === 'compact')
  ) {
    next.density = record.density;
  }

  if (typeof record.fontScale === 'number' && Number.isFinite(record.fontScale)) {
    next.fontScale = record.fontScale;
  }

  for (const key of BOOLEAN_KEYS) {
    const value = record[key];
    if (typeof value === 'boolean') {
      next[key] = value;
    }
  }

  return next;
}

export function getAppearancePayload(): AppearancePayload {
  const settings = readAppearanceSettings();
  return {
    settings,
    options: {
      themes: [...APPEARANCE_OPTIONS.themes],
      accents: [...APPEARANCE_OPTIONS.accents],
      wallpapers: [...APPEARANCE_OPTIONS.wallpapers],
      densities: [...APPEARANCE_OPTIONS.densities],
    },
  };
}
