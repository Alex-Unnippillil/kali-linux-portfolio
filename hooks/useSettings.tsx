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
  defaults,
} from '../utils/settingsStore';
import {
  DesktopTheme,
  DESKTOP_THEME_PRESETS,
  resolveDesktopTheme,
  getTheme as loadTheme,
  setTheme as saveTheme,
} from '../utils/theme';
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

const getReadableTextColor = (color: string): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#000000' : '#ffffff';
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
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [useKaliWallpaper, setUseKaliWallpaper] = useState<boolean>(defaults.useKaliWallpaper);
  const [density, setDensity] = useState<Density>(defaults.density as Density);
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

  useEffect(() => {
    (async () => {
      setAccent(await loadAccent());
      setWallpaper(await loadWallpaper());
      setUseKaliWallpaper(await loadUseKaliWallpaper());
      setDensity((await loadDensity()) as Density);
      setReducedMotion(await loadReducedMotion());
      setFontScale(await loadFontScale());
      setHighContrast(await loadHighContrast());
      setLargeHitAreas(await loadLargeHitAreas());
      setPongSpin(await loadPongSpin());
      setAllowNetwork(await loadAllowNetwork());
      setHaptics(await loadHaptics());
      setTheme(loadTheme());
    })();
  }, []);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const border = shadeColor(accent, -0.2);
    const focus = shadeColor(accent, 0.2);
    const contrast = getReadableTextColor(accent);
    const vars: Record<string, string> = {
      '--color-ub-orange': accent,
      '--color-ub-border-orange': border,
      '--color-primary': accent,
      '--color-accent': accent,
      '--color-focus-ring': focus,
      '--color-selection': accent,
      '--color-control-accent': accent,
      '--primary': accent,
      '--accent': accent,
      '--focus-ring': focus,
      '--primary-contrast': contrast,
      '--color-window-accent': accent,
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
        '--space-hairline': '2px',
        '--space-1': '4px',
        '--space-2': '8px',
        '--space-3': '12px',
        '--space-4': '16px',
        '--space-5': '24px',
        '--space-6': '32px',
        '--space-7': '48px',
        '--space-8': '64px',
        '--space-mobile-1': '8px',
        '--space-mobile-2': '12px',
        '--space-mobile-3': '16px',
        '--space-mobile-4': '20px',
        '--space-mobile-5': '24px',
        '--space-mobile-6': '32px',
      },
      compact: {
        '--space-hairline': '2px',
        '--space-1': '3px',
        '--space-2': '6px',
        '--space-3': '9px',
        '--space-4': '12px',
        '--space-5': '18px',
        '--space-6': '24px',
        '--space-7': '36px',
        '--space-8': '48px',
        '--space-mobile-1': '6px',
        '--space-mobile-2': '9px',
        '--space-mobile-3': '12px',
        '--space-mobile-4': '16px',
        '--space-mobile-5': '20px',
        '--space-mobile-6': '24px',
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

