import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
} from 'react';
import { defaults, Density, useSettingsStore } from '../utils/settingsStore';
import {
  DesktopTheme,
  DESKTOP_THEME_PRESETS,
  resolveDesktopTheme,
  setTheme as saveTheme,
} from '../utils/theme';

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
  const {
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
    setAccent,
    setWallpaper,
    setUseKaliWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    setHaptics,
    setTheme,
  } = useSettingsStore();
  const fetchRef = useRef<typeof fetch | null>(null);
  const previousThemeRef = useRef<string | null>(null);

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
  }, [accent]);

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
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-multiplier', fontScale.toString());
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-hit-area', largeHitAreas);
  }, [largeHitAreas]);

  useEffect(() => {
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
