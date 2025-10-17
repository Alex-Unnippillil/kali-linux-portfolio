import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useRef,
} from 'react';
import {
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  getUseKaliWallpaper as loadUseKaliWallpaper,
  setUseKaliWallpaper as saveUseKaliWallpaper,
  getDensityPreferences as loadDensityPreferences,
  setDensityPreferences as persistDensityPreferences,
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
  defaults,
} from '../utils/settingsStore';
import {
  DesktopTheme,
  DESKTOP_THEME_PRESETS,
  resolveDesktopTheme,
  getTheme as loadTheme,
  setTheme as saveTheme,
} from '../utils/theme';
export type Density = 'regular' | 'compact';
export type DensityBreakpoint = 'small' | 'medium' | 'large';
export type DensityPreferences = Record<DensityBreakpoint, Density>;

const ensureDensityValue = (value?: string): Density =>
  value === 'compact' ? 'compact' : 'regular';

const defaultPreferenceSource = (
  (defaults as unknown as { densityPreferences?: Partial<DensityPreferences> })
    .densityPreferences ?? {}
);

const DEFAULT_DENSITY_PREFERENCES: DensityPreferences = {
  small: ensureDensityValue(
    defaultPreferenceSource.small ?? (defaults.density as Density),
  ),
  medium: ensureDensityValue(
    defaultPreferenceSource.medium ?? (defaults.density as Density),
  ),
  large: ensureDensityValue(
    defaultPreferenceSource.large ?? (defaults.density as Density),
  ),
};

const sanitizeDensityPreferences = (
  preferences?: Partial<Record<DensityBreakpoint, string>>,
): DensityPreferences => ({
  small: ensureDensityValue(
    preferences?.small ?? DEFAULT_DENSITY_PREFERENCES.small,
  ),
  medium: ensureDensityValue(
    preferences?.medium ?? DEFAULT_DENSITY_PREFERENCES.medium,
  ),
  large: ensureDensityValue(
    preferences?.large ?? DEFAULT_DENSITY_PREFERENCES.large,
  ),
});

export const DENSITY_BREAKPOINTS: Array<{
  id: DensityBreakpoint;
  min: number;
  max: number;
  label: string;
}> = [
  { id: 'small', min: 0, max: 1023, label: 'Small displays (≤1023px)' },
  { id: 'medium', min: 1024, max: 1439, label: 'Medium displays (1024–1439px)' },
  { id: 'large', min: 1440, max: Infinity, label: 'Large displays (≥1440px)' },
];

const getBreakpointForWidth = (width?: number): DensityBreakpoint => {
  if (typeof width !== 'number' || Number.isNaN(width)) return 'large';
  const match = DENSITY_BREAKPOINTS.find(
    (breakpoint) => width >= breakpoint.min && width <= breakpoint.max,
  );
  return match ? match.id : 'large';
};

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

interface SettingsContextValue {
  accent: string;
  wallpaper: string;
  bgImageName: string;
  useKaliWallpaper: boolean;
  density: Density;
  densityPreferences: DensityPreferences;
  densityBreakpoint: DensityBreakpoint;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
  desktopTheme: DesktopTheme;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setUseKaliWallpaper: (value: boolean) => void;
  setDensity: (density: Density, target?: DensityBreakpoint | 'all') => void;
  setDensityPreferences: (preferences: DensityPreferences) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setTheme: (value: string) => void;
}

const DEFAULT_DESKTOP_THEME = resolveDesktopTheme({
  theme: 'default',
  accent: defaults.accent,
  wallpaperName: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
});

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  useKaliWallpaper: defaults.useKaliWallpaper,
  density: defaults.density as Density,
  densityPreferences: DEFAULT_DENSITY_PREFERENCES,
  densityBreakpoint: 'large',
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  theme: 'default',
  desktopTheme: DEFAULT_DESKTOP_THEME,
  setAccent: () => {},
  setWallpaper: () => {},
  setUseKaliWallpaper: () => {},
  setDensity: () => {},
  setDensityPreferences: () => {},
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
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [useKaliWallpaper, setUseKaliWallpaper] = useState<boolean>(defaults.useKaliWallpaper);
  const [densityPreferences, setDensityPreferencesState] = useState<DensityPreferences>(() =>
    sanitizeDensityPreferences(),
  );
  const [densityBreakpoint, setDensityBreakpoint] = useState<DensityBreakpoint>(() =>
    getBreakpointForWidth(typeof window !== 'undefined' ? window.innerWidth : undefined),
  );
  const [density, setDensityState] = useState<Density>(() => {
    const breakpoint = getBreakpointForWidth(
      typeof window !== 'undefined' ? window.innerWidth : undefined,
    );
    return sanitizeDensityPreferences()[breakpoint];
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaults.reducedMotion);
  const [fontScale, setFontScale] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrast] = useState<boolean>(defaults.highContrast);
  const [largeHitAreas, setLargeHitAreas] = useState<boolean>(defaults.largeHitAreas);
  const [pongSpin, setPongSpin] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetwork] = useState<boolean>(defaults.allowNetwork);
  const [haptics, setHaptics] = useState<boolean>(defaults.haptics);
  const [theme, setTheme] = useState<string>(() => loadTheme());
  const fetchRef = useRef<typeof fetch | null>(null);
  const previousThemeRef = useRef<string | null>(null);

  const applyDensityPreferences = (
    updater:
      | DensityPreferences
      | Partial<Record<DensityBreakpoint, string>>
      | ((prev: DensityPreferences) => DensityPreferences | Partial<Record<DensityBreakpoint, string>>),
    options: { persist?: boolean } = {},
  ) => {
    const { persist = true } = options;
    setDensityPreferencesState((prev) => {
      const candidate =
        typeof updater === 'function'
          ? (updater as (
              prev: DensityPreferences,
            ) => DensityPreferences | Partial<Record<DensityBreakpoint, string>>)(prev)
          : updater;
      const next = sanitizeDensityPreferences(candidate as Partial<
        Record<DensityBreakpoint, string>
      >);
      const hasChanged =
        prev.small !== next.small ||
        prev.medium !== next.medium ||
        prev.large !== next.large;
      if (hasChanged && persist) {
        void persistDensityPreferences(next);
      }
      return hasChanged ? next : prev;
    });
  };

  const setDensityPreferencesValue = (preferences: DensityPreferences) => {
    applyDensityPreferences(preferences);
  };

  const setDensityValue = (
    value: Density,
    target: DensityBreakpoint | 'all' = densityBreakpoint,
  ) => {
    if (target === 'all') {
      applyDensityPreferences({
        small: value,
        medium: value,
        large: value,
      });
      setDensityState((prev) => (prev === value ? prev : value));
      return;
    }
    applyDensityPreferences((prev) => {
      if (prev[target] === value) {
        return prev;
      }
      return { ...prev, [target]: value };
    });
    if (target === densityBreakpoint) {
      setDensityState((prev) => (prev === value ? prev : value));
    }
  };

  useEffect(() => {
    (async () => {
      const [
        loadedAccent,
        loadedWallpaper,
        loadedUseKali,
        loadedDensityPreferences,
        loadedReducedMotion,
        loadedFontScale,
        loadedHighContrast,
        loadedLargeHitAreas,
        loadedPongSpin,
        loadedAllowNetwork,
        loadedHaptics,
      ] = await Promise.all([
        loadAccent(),
        loadWallpaper(),
        loadUseKaliWallpaper(),
        loadDensityPreferences(),
        loadReducedMotion(),
        loadFontScale(),
        loadHighContrast(),
        loadLargeHitAreas(),
        loadPongSpin(),
        loadAllowNetwork(),
        loadHaptics(),
      ]);
      setAccent(loadedAccent);
      setWallpaper(loadedWallpaper);
      setUseKaliWallpaper(loadedUseKali);
      applyDensityPreferences(loadedDensityPreferences, { persist: false });
      setReducedMotion(loadedReducedMotion);
      setFontScale(loadedFontScale);
      setHighContrast(loadedHighContrast);
      setLargeHitAreas(loadedLargeHitAreas);
      setPongSpin(loadedPongSpin);
      setAllowNetwork(loadedAllowNetwork);
      setHaptics(loadedHaptics);
      setTheme(loadTheme());
    })();
  }, []);

  useEffect(() => {
    const nextDensity =
      densityPreferences[densityBreakpoint] ?? (defaults.density as Density);
    setDensityState((prev) => (prev === nextDensity ? prev : nextDensity));
  }, [densityPreferences, densityBreakpoint]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const schedule = (callback: () => void): number => {
      if (typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(() => callback());
      }
      return window.setTimeout(callback, 0);
    };
    const cancel = (id: number) => {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(id);
      } else {
        window.clearTimeout(id);
      }
    };
    let frame: number | null = null;
    const commitBreakpoint = () => {
      frame = null;
      const next = getBreakpointForWidth(window.innerWidth);
      setDensityBreakpoint((prev) => (prev === next ? prev : next));
    };
    const handleResize = () => {
      if (frame !== null) {
        cancel(frame);
      }
      frame = schedule(commitBreakpoint);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      if (frame !== null) {
        cancel(frame);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    saveUseKaliWallpaper(useKaliWallpaper);
  }, [useKaliWallpaper]);

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
      const normalizeRequest = (input: RequestInfo | URL): URL | null => {
        if (typeof window === 'undefined') return null;
        try {
          if (typeof input === 'string') {
            return new URL(input, window.location.href);
          }
          if (input instanceof URL) {
            return new URL(input.href, window.location.href);
          }
          if (typeof Request !== 'undefined' && input instanceof Request) {
            return new URL(input.url, window.location.href);
          }
          if (typeof input === 'object' && input) {
            const candidate =
              (input as { url?: string | URL }).url ?? (input as { href?: string | URL }).href;
            if (candidate instanceof URL) {
              return new URL(candidate.href, window.location.href);
            }
            if (typeof candidate === 'string') {
              return new URL(candidate, window.location.href);
            }
          }
        } catch {
          return null;
        }
        return null;
      };

      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const resolvedUrl = normalizeRequest(input);
        if (resolvedUrl) {
          const protocol = resolvedUrl.protocol.toLowerCase();
          const isHttp = protocol === 'http:' || protocol === 'https:';
          const isSameOrigin = resolvedUrl.origin === window.location.origin;
          if (isHttp && !isSameOrigin) {
            return Promise.reject(new Error('Network requests disabled'));
          }
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

  const bgImageName = useKaliWallpaper ? 'kali-gradient' : wallpaper;
  const desktopTheme = useMemo(
    () =>
      resolveDesktopTheme({
        theme,
        accent,
        wallpaperName: wallpaper,
        bgImageName,
        useKaliWallpaper,
      }),
    [theme, accent, wallpaper, bgImageName, useKaliWallpaper],
  );

  useEffect(() => {
    const previousTheme = previousThemeRef.current;
    const firstRun = previousTheme === null;
    const themeChanged = previousTheme !== null && previousTheme !== theme;
    const preset = DESKTOP_THEME_PRESETS[theme];

    if (firstRun || themeChanged) {
      if (preset?.accent && preset.accent !== accent) {
        setAccent(preset.accent);
      }
      if (preset?.wallpaperName && preset.wallpaperName !== wallpaper) {
        setWallpaper(preset.wallpaperName);
      }
      if (
        preset?.useKaliWallpaper !== undefined &&
        preset.useKaliWallpaper !== useKaliWallpaper
      ) {
        setUseKaliWallpaper(preset.useKaliWallpaper);
      }
      previousThemeRef.current = theme;
    }
  }, [
    theme,
    accent,
    wallpaper,
    useKaliWallpaper,
    setAccent,
    setWallpaper,
    setUseKaliWallpaper,
  ]);

  return (
    <SettingsContext.Provider
      value={{
        accent,
        wallpaper,
        bgImageName,
        useKaliWallpaper,
        density,
        densityPreferences,
        densityBreakpoint,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
        theme,
        desktopTheme,
        setAccent,
        setWallpaper,
        setUseKaliWallpaper,
        setDensity: setDensityValue,
        setDensityPreferences: setDensityPreferencesValue,
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

