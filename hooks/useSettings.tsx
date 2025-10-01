import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
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
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
import { recordStep } from '../utils/dev/reproRecorder';
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

export interface SettingsContextValue {
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
  const [accent, setAccentState] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaperState] = useState<string>(defaults.wallpaper);
  const [useKaliWallpaper, setUseKaliWallpaperState] = useState<boolean>(defaults.useKaliWallpaper);
  const [density, setDensityState] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(defaults.reducedMotion);
  const [fontScale, setFontScaleState] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrastState] = useState<boolean>(defaults.highContrast);
  const [largeHitAreas, setLargeHitAreasState] = useState<boolean>(defaults.largeHitAreas);
  const [pongSpin, setPongSpinState] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetworkState] = useState<boolean>(defaults.allowNetwork);
  const [haptics, setHapticsState] = useState<boolean>(defaults.haptics);
  const [theme, setThemeState] = useState<string>(() => loadTheme());
  const fetchRef = useRef<typeof fetch | null>(null);

  const updateSetting = useCallback(
    <T,>(
      setter: (value: T) => void,
      label: string,
      value: T,
    ) => {
      setter(value);
      recordStep(`settings:${label}`, { value });
    },
    [],
  );

  const setAccent = useCallback((value: string) => updateSetting(setAccentState, 'accent', value), [updateSetting]);
  const setWallpaper = useCallback(
    (value: string) => updateSetting(setWallpaperState, 'wallpaper', value),
    [updateSetting],
  );
  const setUseKaliWallpaper = useCallback(
    (value: boolean) => updateSetting(setUseKaliWallpaperState, 'use-kali-wallpaper', value),
    [updateSetting],
  );
  const setDensity = useCallback(
    (value: Density) => updateSetting(setDensityState, 'density', value),
    [updateSetting],
  );
  const setReducedMotion = useCallback(
    (value: boolean) => updateSetting(setReducedMotionState, 'reduced-motion', value),
    [updateSetting],
  );
  const setFontScale = useCallback(
    (value: number) => updateSetting(setFontScaleState, 'font-scale', value),
    [updateSetting],
  );
  const setHighContrast = useCallback(
    (value: boolean) => updateSetting(setHighContrastState, 'high-contrast', value),
    [updateSetting],
  );
  const setLargeHitAreas = useCallback(
    (value: boolean) => updateSetting(setLargeHitAreasState, 'large-hit-areas', value),
    [updateSetting],
  );
  const setPongSpin = useCallback(
    (value: boolean) => updateSetting(setPongSpinState, 'pong-spin', value),
    [updateSetting],
  );
  const setAllowNetwork = useCallback(
    (value: boolean) => updateSetting(setAllowNetworkState, 'allow-network', value),
    [updateSetting],
  );
  const setHaptics = useCallback(
    (value: boolean) => updateSetting(setHapticsState, 'haptics', value),
    [updateSetting],
  );
  const setTheme = useCallback((value: string) => updateSetting(setThemeState, 'theme', value), [updateSetting]);

  useEffect(() => {
    (async () => {
      setAccentState(await loadAccent());
      setWallpaperState(await loadWallpaper());
      setUseKaliWallpaperState(await loadUseKaliWallpaper());
      setDensityState((await loadDensity()) as Density);
      setReducedMotionState(await loadReducedMotion());
      setFontScaleState(await loadFontScale());
      setHighContrastState(await loadHighContrast());
      setLargeHitAreasState(await loadLargeHitAreas());
      setPongSpinState(await loadPongSpin());
      setAllowNetworkState(await loadAllowNetwork());
      setHapticsState(await loadHaptics());
      setThemeState(loadTheme());
    })();
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

  const bgImageName = useKaliWallpaper ? 'kali-gradient' : wallpaper;

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

