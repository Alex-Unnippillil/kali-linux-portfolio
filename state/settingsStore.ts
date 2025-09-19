import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme as applyTheme } from '../utils/theme';

export type Density = 'regular' | 'compact';

export interface SettingsState {
  accent: string;
  wallpaper: string;
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

export interface SettingsActions {
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setTheme: (value: string) => void;
  exportSettings: () => Promise<string>;
  importSettings: (value: unknown) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export interface SettingsStore {
  getState: () => SettingsState;
  getActions: () => SettingsActions;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => Promise<void>;
}

export const defaults: Omit<SettingsState, 'theme'> & { theme: string } = {
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
  theme: 'default',
};

export const selectSettingsState = (state: SettingsState) => state;
export const selectAccent = (state: SettingsState) => state.accent;
export const selectWallpaper = (state: SettingsState) => state.wallpaper;
export const selectDensity = (state: SettingsState) => state.density;
export const selectReducedMotion = (state: SettingsState) => state.reducedMotion;
export const selectFontScale = (state: SettingsState) => state.fontScale;
export const selectHighContrast = (state: SettingsState) => state.highContrast;
export const selectLargeHitAreas = (state: SettingsState) => state.largeHitAreas;
export const selectPongSpin = (state: SettingsState) => state.pongSpin;
export const selectAllowNetwork = (state: SettingsState) => state.allowNetwork;
export const selectHaptics = (state: SettingsState) => state.haptics;
export const selectTheme = (state: SettingsState) => state.theme;

type PartialSettings = Partial<SettingsState>;

type Listener = () => void;

const ACCENT_KEY = 'accent';
const WALLPAPER_KEY = 'bg-image';
const DENSITY_KEY = 'density';
const REDUCED_MOTION_KEY = 'reduced-motion';
const FONT_SCALE_KEY = 'font-scale';
const HIGH_CONTRAST_KEY = 'high-contrast';
const LARGE_HIT_AREAS_KEY = 'large-hit-areas';
const PONG_SPIN_KEY = 'pong-spin';
const ALLOW_NETWORK_KEY = 'allow-network';
const HAPTICS_KEY = 'haptics';

let originalFetch: typeof fetch | null = null;

const shadeColor = (color: string, percent: number): string => {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
};

const applyAccent = (accent: string) => {
  if (typeof document === 'undefined') return;
  const border = shadeColor(accent, -0.2);
  const vars: Record<string, string> = {
    '--color-ub-orange': accent,
    '--color-ub-border-orange': border,
    '--color-primary': accent,
    '--color-accent': accent,
    '--color-focus-ring': accent,
    '--color-selection': accent,
    '--color-control-accent': accent,
  };
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

const applyDensity = (density: Density) => {
  if (typeof document === 'undefined') return;
  const spacing: Record<Density, Record<string, string>> = {
    regular: {
      '--space-1': '0.25rem',
      '--space-2': '0.5rem',
      '--space-3': '0.75rem',
      '--space-4': '1rem',
      '--space-5': '1.5rem',
      '--space-6': '2rem',
    },
    compact: {
      '--space-1': '0.125rem',
      '--space-2': '0.25rem',
      '--space-3': '0.5rem',
      '--space-4': '0.75rem',
      '--space-5': '1rem',
      '--space-6': '1.5rem',
    },
  };
  const vars = spacing[density];
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

const applyReducedMotion = (value: boolean) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduced-motion', value);
};

const applyFontScale = (value: number) => {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--font-multiplier', value.toString());
};

const applyHighContrast = (value: boolean) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('high-contrast', value);
};

const applyLargeHitAreas = (value: boolean) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('large-hit-area', value);
};

const applyAllowNetwork = (allowNetwork: boolean) => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }
  if (!allowNetwork) {
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : 'url' in input
            ? input.url
            : input.href;
      if (
        /^https?:/i.test(url) &&
        !url.startsWith(window.location.origin) &&
        !url.startsWith('/')
      ) {
        return Promise.reject(new Error('Network requests disabled'));
      }
      return originalFetch!(input, init);
    };
  } else if (originalFetch) {
    window.fetch = originalFetch;
  }
};

const persistAccent = async (accent: string) => {
  if (typeof window === 'undefined') return;
  try {
    await set(ACCENT_KEY, accent);
  } catch {
    /* ignore */
  }
};

const persistWallpaper = async (wallpaper: string) => {
  if (typeof window === 'undefined') return;
  try {
    await set(WALLPAPER_KEY, wallpaper);
  } catch {
    /* ignore */
  }
};

const persistDensity = (density: Density) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DENSITY_KEY, density);
  } catch {
    /* ignore */
  }
};

const persistReducedMotion = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REDUCED_MOTION_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const persistFontScale = (value: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_SCALE_KEY, String(value));
  } catch {
    /* ignore */
  }
};

const persistHighContrast = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIGH_CONTRAST_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const persistLargeHitAreas = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LARGE_HIT_AREAS_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const persistPongSpin = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PONG_SPIN_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const persistAllowNetwork = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALLOW_NETWORK_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const persistHaptics = (value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAPTICS_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
};

const loadAccent = async (): Promise<string> => {
  if (typeof window === 'undefined') return defaults.accent;
  try {
    return (await get<string>(ACCENT_KEY)) || defaults.accent;
  } catch {
    return defaults.accent;
  }
};

const loadWallpaper = async (): Promise<string> => {
  if (typeof window === 'undefined') return defaults.wallpaper;
  try {
    return (await get<string>(WALLPAPER_KEY)) || defaults.wallpaper;
  } catch {
    return defaults.wallpaper;
  }
};

const loadDensity = async (): Promise<Density> => {
  if (typeof window === 'undefined') return defaults.density;
  try {
    const stored = window.localStorage.getItem(DENSITY_KEY);
    if (stored === 'regular' || stored === 'compact') return stored;
  } catch {
    /* ignore */
  }
  return defaults.density;
};

const loadReducedMotion = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.reducedMotion;
  try {
    const stored = window.localStorage.getItem(REDUCED_MOTION_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    /* ignore */
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return defaults.reducedMotion;
  }
};

const loadFontScale = async (): Promise<number> => {
  if (typeof window === 'undefined') return defaults.fontScale;
  try {
    const stored = window.localStorage.getItem(FONT_SCALE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      return Number.isNaN(parsed) ? defaults.fontScale : parsed;
    }
  } catch {
    /* ignore */
  }
  return defaults.fontScale;
};

const loadHighContrast = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.highContrast;
  try {
    return window.localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
  } catch {
    return defaults.highContrast;
  }
};

const loadLargeHitAreas = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.largeHitAreas;
  try {
    return window.localStorage.getItem(LARGE_HIT_AREAS_KEY) === 'true';
  } catch {
    return defaults.largeHitAreas;
  }
};

const loadPongSpin = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.pongSpin;
  try {
    const stored = window.localStorage.getItem(PONG_SPIN_KEY);
    return stored === null ? defaults.pongSpin : stored === 'true';
  } catch {
    return defaults.pongSpin;
  }
};

const loadAllowNetwork = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.allowNetwork;
  try {
    return window.localStorage.getItem(ALLOW_NETWORK_KEY) === 'true';
  } catch {
    return defaults.allowNetwork;
  }
};

const loadHaptics = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return defaults.haptics;
  try {
    const stored = window.localStorage.getItem(HAPTICS_KEY);
    return stored === null ? defaults.haptics : stored === 'true';
  } catch {
    return defaults.haptics;
  }
};

const loadStoredSettings = async (): Promise<SettingsState> => {
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
    loadAccent(),
    loadWallpaper(),
    loadDensity(),
    loadReducedMotion(),
    loadFontScale(),
    loadHighContrast(),
    loadLargeHitAreas(),
    loadPongSpin(),
    loadAllowNetwork(),
    loadHaptics(),
  ]);
  const theme = getTheme();
  return {
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
  };
};

const applyStateEffects = (state: SettingsState) => {
  applyAccent(state.accent);
  applyDensity(state.density);
  applyReducedMotion(state.reducedMotion);
  applyFontScale(state.fontScale);
  applyHighContrast(state.highContrast);
  applyLargeHitAreas(state.largeHitAreas);
  applyAllowNetwork(state.allowNetwork);
  applyTheme(state.theme);
};

export function createSettingsStore(): SettingsStore {
  const listeners = new Set<Listener>();
  let state: SettingsState = { ...defaults, theme: getTheme() };

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const setState = (partial: PartialSettings): PartialSettings | null => {
    const entries = Object.entries(partial) as [
      keyof SettingsState,
      SettingsState[keyof SettingsState],
    ][];
    const changedEntries: typeof entries = [];
    for (const [key, value] of entries) {
      if (!Object.is(state[key], value)) {
        changedEntries.push([key, value]);
      }
    }
    if (changedEntries.length === 0) {
      return null;
    }
    const changedPartial = Object.fromEntries(changedEntries) as PartialSettings;
    state = { ...state, ...changedPartial };
    notify();
    return changedPartial;
  };

  const applyPartialEffects = (partial: PartialSettings) => {
    if (partial.accent !== undefined) {
      applyAccent(partial.accent);
      void persistAccent(partial.accent);
    }
    if (partial.wallpaper !== undefined) {
      void persistWallpaper(partial.wallpaper);
    }
    if (partial.density !== undefined) {
      applyDensity(partial.density);
      void Promise.resolve(persistDensity(partial.density));
    }
    if (partial.reducedMotion !== undefined) {
      applyReducedMotion(partial.reducedMotion);
      void Promise.resolve(persistReducedMotion(partial.reducedMotion));
    }
    if (partial.fontScale !== undefined) {
      applyFontScale(partial.fontScale);
      void Promise.resolve(persistFontScale(partial.fontScale));
    }
    if (partial.highContrast !== undefined) {
      applyHighContrast(partial.highContrast);
      void Promise.resolve(persistHighContrast(partial.highContrast));
    }
    if (partial.largeHitAreas !== undefined) {
      applyLargeHitAreas(partial.largeHitAreas);
      void Promise.resolve(persistLargeHitAreas(partial.largeHitAreas));
    }
    if (partial.pongSpin !== undefined) {
      void Promise.resolve(persistPongSpin(partial.pongSpin));
    }
    if (partial.allowNetwork !== undefined) {
      applyAllowNetwork(partial.allowNetwork);
      void Promise.resolve(persistAllowNetwork(partial.allowNetwork));
    }
    if (partial.haptics !== undefined) {
      void Promise.resolve(persistHaptics(partial.haptics));
    }
    if (partial.theme !== undefined) {
      applyTheme(partial.theme);
    }
  };

  const getState = () => state;

  const actions: SettingsActions = {
    setAccent: (accent) => {
      const changed = setState({ accent });
      if (changed) applyPartialEffects(changed);
    },
    setWallpaper: (wallpaper) => {
      const changed = setState({ wallpaper });
      if (changed) applyPartialEffects(changed);
    },
    setDensity: (density) => {
      const changed = setState({ density });
      if (changed) applyPartialEffects(changed);
    },
    setReducedMotion: (value) => {
      const changed = setState({ reducedMotion: value });
      if (changed) applyPartialEffects(changed);
    },
    setFontScale: (value) => {
      const changed = setState({ fontScale: value });
      if (changed) applyPartialEffects(changed);
    },
    setHighContrast: (value) => {
      const changed = setState({ highContrast: value });
      if (changed) applyPartialEffects(changed);
    },
    setLargeHitAreas: (value) => {
      const changed = setState({ largeHitAreas: value });
      if (changed) applyPartialEffects(changed);
    },
    setPongSpin: (value) => {
      const changed = setState({ pongSpin: value });
      if (changed) applyPartialEffects(changed);
    },
    setAllowNetwork: (value) => {
      const changed = setState({ allowNetwork: value });
      if (changed) applyPartialEffects(changed);
    },
    setHaptics: (value) => {
      const changed = setState({ haptics: value });
      if (changed) applyPartialEffects(changed);
    },
    setTheme: (value) => {
      const changed = setState({ theme: value });
      if (changed) applyPartialEffects(changed);
    },
    exportSettings: async () => {
      const settings = await loadStoredSettings();
      return JSON.stringify(settings);
    },
    importSettings: async (value) => {
      if (typeof window === 'undefined') return;
      let parsed: Partial<SettingsState> | null = null;
      try {
        parsed =
          typeof value === 'string'
            ? JSON.parse(value)
            : (value as Partial<SettingsState>);
      } catch (error) {
        console.error('Failed to import settings', error);
        return;
      }
      if (!parsed) return;

      const next: PartialSettings = {};
      if (typeof parsed.accent === 'string') next.accent = parsed.accent;
      if (typeof parsed.wallpaper === 'string') next.wallpaper = parsed.wallpaper;
      if (parsed.density === 'regular' || parsed.density === 'compact') {
        next.density = parsed.density;
      }
      if (typeof parsed.reducedMotion === 'boolean') {
        next.reducedMotion = parsed.reducedMotion;
      }
      if (typeof parsed.fontScale === 'number' && Number.isFinite(parsed.fontScale)) {
        next.fontScale = parsed.fontScale;
      }
      if (typeof parsed.highContrast === 'boolean') {
        next.highContrast = parsed.highContrast;
      }
      if (typeof parsed.largeHitAreas === 'boolean') {
        next.largeHitAreas = parsed.largeHitAreas;
      }
      if (typeof parsed.pongSpin === 'boolean') {
        next.pongSpin = parsed.pongSpin;
      }
      if (typeof parsed.allowNetwork === 'boolean') {
        next.allowNetwork = parsed.allowNetwork;
      }
      if (typeof parsed.haptics === 'boolean') {
        next.haptics = parsed.haptics;
      }
      if (typeof parsed.theme === 'string') {
        next.theme = parsed.theme;
      }

      const changed = setState(next);
      if (changed) {
        applyPartialEffects(changed);
      }
    },
    resetSettings: async () => {
      if (typeof window === 'undefined') return;
      try {
        await Promise.all([del(ACCENT_KEY), del(WALLPAPER_KEY)]);
      } catch {
        /* ignore */
      }
      try {
        window.localStorage.removeItem(DENSITY_KEY);
        window.localStorage.removeItem(REDUCED_MOTION_KEY);
        window.localStorage.removeItem(FONT_SCALE_KEY);
        window.localStorage.removeItem(HIGH_CONTRAST_KEY);
        window.localStorage.removeItem(LARGE_HIT_AREAS_KEY);
        window.localStorage.removeItem(PONG_SPIN_KEY);
        window.localStorage.removeItem(ALLOW_NETWORK_KEY);
        window.localStorage.removeItem(HAPTICS_KEY);
      } catch {
        /* ignore */
      }
      const defaultState = { ...defaults } as PartialSettings;
      const changed = setState(defaultState);
      if (changed) {
        applyPartialEffects(changed);
      } else {
        applyStateEffects(state);
      }
    },
  };

  applyStateEffects(state);

  return {
    getState,
    getActions: () => actions,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate: async () => {
      if (typeof window === 'undefined') return;
      try {
        const loaded = await loadStoredSettings();
        setState(loaded);
        applyStateEffects(state);
      } catch {
        /* ignore hydration errors */
      }
    },
  };
}
