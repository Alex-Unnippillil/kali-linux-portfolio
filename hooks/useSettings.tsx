import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import {
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  getDensity as loadDensity,
  setDensity as saveDensity,
  getReducedMotion as loadReducedMotion,
  setReducedMotion as saveReducedMotion,
  getFontScale as loadFontScale,
  setFontScale as saveFontScale,
  getHighContrast as loadHighContrast,
  setHighContrast as saveHighContrast,
  getLargeHitAreas as loadLargeHitAreas,
  setLargeHitAreas as saveLargeHitAreas,
  getPongSpin as loadPongSpin,
  setPongSpin as savePongSpin,
  getAllowNetwork as loadAllowNetwork,
  setAllowNetwork as saveAllowNetwork,
  getHaptics as loadHaptics,
  setHaptics as saveHaptics,
  getRecentChanges as loadRecentChanges,
  logRecentChange,
  RECENT_CHANGES_LIMIT,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
type Density = 'regular' | 'compact';

// Predefined accent palette exposed to settings UI
export const ACCENT_OPTIONS = [
  '#1793d1', // kali blue (default)
  '#e53e3e', // red
  '#d97706', // orange
  '#38a169', // green
  '#805ad5', // purple
  '#ed64a6', // pink
];

// Utility to lighten or darken a hex color by a percentage
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

type SettingSection = 'appearance' | 'accessibility' | 'privacy' | 'general';

type SettingKey =
  | 'accent'
  | 'wallpaper'
  | 'density'
  | 'reducedMotion'
  | 'fontScale'
  | 'highContrast'
  | 'largeHitAreas'
  | 'pongSpin'
  | 'allowNetwork'
  | 'haptics'
  | 'theme';

export interface RecentSettingChange {
  key: SettingKey;
  label: string;
  value: string;
  timestamp: number;
  section: SettingSection;
}

type ChangeMetadata = {
  label: string;
  section: SettingSection;
  format?: (value: unknown) => string;
};

const booleanFormatter = (value: unknown) => (value ? 'On' : 'Off');
const densityFormatter = (value: unknown) =>
  value === 'compact' ? 'Compact' : 'Regular';
const wallpaperFormatter = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const suffix = value.replace('wall-', 'Wallpaper ');
  return suffix.replace(/-/g, ' ');
};
const fontScaleFormatter = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) return '';
  const rounded = Math.round(numeric * 100) / 100;
  return `${rounded.toString()}x`;
};
const themeFormatter = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const CHANGE_METADATA: Record<SettingKey, ChangeMetadata> = {
  accent: { label: 'Accent color', section: 'appearance' },
  wallpaper: {
    label: 'Wallpaper',
    section: 'appearance',
    format: wallpaperFormatter,
  },
  density: { label: 'Density', section: 'accessibility', format: densityFormatter },
  reducedMotion: {
    label: 'Reduced motion',
    section: 'accessibility',
    format: booleanFormatter,
  },
  fontScale: {
    label: 'Icon size',
    section: 'accessibility',
    format: fontScaleFormatter,
  },
  highContrast: {
    label: 'High contrast',
    section: 'accessibility',
    format: booleanFormatter,
  },
  largeHitAreas: {
    label: 'Large hit areas',
    section: 'accessibility',
    format: booleanFormatter,
  },
  pongSpin: {
    label: 'Pong spin',
    section: 'general',
    format: booleanFormatter,
  },
  allowNetwork: {
    label: 'External network access',
    section: 'privacy',
    format: (value) => (value ? 'Enabled' : 'Disabled'),
  },
  haptics: {
    label: 'Haptics',
    section: 'accessibility',
    format: booleanFormatter,
  },
  theme: {
    label: 'Theme',
    section: 'appearance',
    format: themeFormatter,
  },
};

const fallbackFormatter = (value: unknown) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const formatChangeValue = (key: SettingKey, value: unknown) => {
  const meta = CHANGE_METADATA[key];
  if (!meta) return fallbackFormatter(value);
  if (!meta.format) return fallbackFormatter(value);
  const formatted = meta.format(value);
  return formatted === undefined || formatted === null
    ? ''
    : String(formatted);
};

const mapSection = (key: SettingKey): SettingSection =>
  CHANGE_METADATA[key]?.section ?? 'general';

interface SettingsContextValue {
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
  recentChanges: RecentSettingChange[];
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
}

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as Density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  recentChanges: [],
  setAccent: () => {},
  setWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setFontScale: () => {},
  setHighContrast: () => {},
  setLargeHitAreas: () => {},
  setPongSpin: () => {},
  setAllowNetwork: () => {},
  setHaptics: () => {},
  setTheme: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaperState] = useState<string>(defaults.wallpaper);
  const [density, setDensityState] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(
    defaults.reducedMotion
  );
  const [fontScale, setFontScaleState] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrastState] = useState<boolean>(
    defaults.highContrast
  );
  const [largeHitAreas, setLargeHitAreasState] = useState<boolean>(
    defaults.largeHitAreas
  );
  const [pongSpin, setPongSpinState] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetworkState] = useState<boolean>(
    defaults.allowNetwork
  );
  const [haptics, setHapticsState] = useState<boolean>(defaults.haptics);
  const [theme, setThemeState] = useState<string>(() => loadTheme());
  const [recentChanges, setRecentChanges] = useState<RecentSettingChange[]>([]);
  const fetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    (async () => {
      setAccentState(await loadAccent());
      setWallpaperState(await loadWallpaper());
      setDensityState((await loadDensity()) as Density);
      setReducedMotionState(await loadReducedMotion());
      setFontScaleState(await loadFontScale());
      setHighContrastState(await loadHighContrast());
      setLargeHitAreasState(await loadLargeHitAreas());
      setPongSpinState(await loadPongSpin());
      setAllowNetworkState(await loadAllowNetwork());
      setHapticsState(await loadHaptics());
      setThemeState(loadTheme());
      setRecentChanges(await loadRecentChanges());
    })();
  }, []);

  const recordChange = useCallback(
    async (key: SettingKey, value: unknown) => {
      const label = CHANGE_METADATA[key]?.label;
      if (!label) return;
      const entry: RecentSettingChange = {
        key,
        label,
        value: formatChangeValue(key, value),
        section: mapSection(key),
        timestamp: Date.now(),
      };
      setRecentChanges((prev) => {
        const next = [entry, ...prev].slice(0, RECENT_CHANGES_LIMIT);
        return next;
      });
      try {
        await logRecentChange(entry);
      } catch (error) {
        console.error('Failed to persist setting change', error);
      }
    },
    [logRecentChange, setRecentChanges]
  );

  const setAccent = useCallback(
    (value: string) => {
      setAccentState((prev) => {
        if (prev === value) return prev;
        void recordChange('accent', value);
        return value;
      });
    },
    [recordChange]
  );

  const setWallpaper = useCallback(
    (value: string) => {
      setWallpaperState((prev) => {
        if (prev === value) return prev;
        void recordChange('wallpaper', value);
        return value;
      });
    },
    [recordChange]
  );

  const setDensity = useCallback(
    (value: Density) => {
      setDensityState((prev) => {
        if (prev === value) return prev;
        void recordChange('density', value);
        return value;
      });
    },
    [recordChange]
  );

  const setReducedMotion = useCallback(
    (value: boolean) => {
      setReducedMotionState((prev) => {
        if (prev === value) return prev;
        void recordChange('reducedMotion', value);
        return value;
      });
    },
    [recordChange]
  );

  const setFontScale = useCallback(
    (value: number) => {
      setFontScaleState((prev) => {
        if (prev === value) return prev;
        void recordChange('fontScale', value);
        return value;
      });
    },
    [recordChange]
  );

  const setHighContrast = useCallback(
    (value: boolean) => {
      setHighContrastState((prev) => {
        if (prev === value) return prev;
        void recordChange('highContrast', value);
        return value;
      });
    },
    [recordChange]
  );

  const setLargeHitAreas = useCallback(
    (value: boolean) => {
      setLargeHitAreasState((prev) => {
        if (prev === value) return prev;
        void recordChange('largeHitAreas', value);
        return value;
      });
    },
    [recordChange]
  );

  const setPongSpin = useCallback(
    (value: boolean) => {
      setPongSpinState((prev) => {
        if (prev === value) return prev;
        void recordChange('pongSpin', value);
        return value;
      });
    },
    [recordChange]
  );

  const setAllowNetwork = useCallback(
    (value: boolean) => {
      setAllowNetworkState((prev) => {
        if (prev === value) return prev;
        void recordChange('allowNetwork', value);
        return value;
      });
    },
    [recordChange]
  );

  const setHaptics = useCallback(
    (value: boolean) => {
      setHapticsState((prev) => {
        if (prev === value) return prev;
        void recordChange('haptics', value);
        return value;
      });
    },
    [recordChange]
  );

  const setTheme = useCallback(
    (value: string) => {
      setThemeState((prev) => {
        if (prev === value) return prev;
        void recordChange('theme', value);
        return value;
      });
    },
    [recordChange]
  );

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
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
    saveAccent(accent);
  }, [accent]);

  useEffect(() => {
    saveWallpaper(wallpaper);
  }, [wallpaper]);

  useEffect(() => {
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
    saveDensity(density);
  }, [density]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    saveReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-multiplier', fontScale.toString());
    saveFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    saveHighContrast(highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-hit-area', largeHitAreas);
    saveLargeHitAreas(largeHitAreas);
  }, [largeHitAreas]);

  useEffect(() => {
    savePongSpin(pongSpin);
  }, [pongSpin]);

  useEffect(() => {
    saveAllowNetwork(allowNetwork);
    if (typeof window === 'undefined') return;
    if (!fetchRef.current) fetchRef.current = window.fetch.bind(window);
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
        return fetchRef.current!(input, init);
      };
    } else {
      window.fetch = fetchRef.current!;
    }
  }, [allowNetwork]);

  useEffect(() => {
    saveHaptics(haptics);
  }, [haptics]);

  return (
    <SettingsContext.Provider
      value={{
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
        recentChanges,
        setAccent,
        setWallpaper,
        setDensity,
        setReducedMotion,
        setFontScale,
        setHighContrast,
        setLargeHitAreas,
        setPongSpin,
        setAllowNetwork,
        setHaptics,
        setTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

