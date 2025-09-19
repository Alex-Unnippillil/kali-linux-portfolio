import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
import { useProfiles } from './useProfiles';
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
  hydrated: boolean;
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
  hydrated: false,
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
  const { activeProfileId } = useProfiles();
  const profileId = activeProfileId ?? null;
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [density, setDensity] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaults.reducedMotion);
  const [fontScale, setFontScale] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrast] = useState<boolean>(defaults.highContrast);
  const [largeHitAreas, setLargeHitAreas] = useState<boolean>(defaults.largeHitAreas);
  const [pongSpin, setPongSpin] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetwork] = useState<boolean>(defaults.allowNetwork);
  const [haptics, setHaptics] = useState<boolean>(defaults.haptics);
  const [theme, setThemeState] = useState<string>(() => loadTheme(profileId));
  const [hydrated, setHydrated] = useState(false);
  const fetchRef = useRef<typeof fetch | null>(null);
  const hydrationRef = useRef(false);
  const userThemeRef = useRef(false);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    hydrationRef.current = true;
    setHydrated(false);
    userThemeRef.current = false;

    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as Density);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setLargeHitAreas(defaults.largeHitAreas);
    setPongSpin(defaults.pongSpin);
    setAllowNetwork(defaults.allowNetwork);
    setHaptics(defaults.haptics);

    const immediateTheme = loadTheme(profileId);
    setThemeState(immediateTheme);
    saveTheme(immediateTheme, profileId);

    (async () => {
      const [
        nextAccent,
        nextWallpaper,
        nextDensity,
        nextReducedMotion,
        nextFontScale,
        nextHighContrast,
        nextLargeHitAreas,
        nextPongSpin,
        nextAllowNetwork,
        nextHaptics,
      ] = await Promise.all([
        loadAccent(profileId),
        loadWallpaper(profileId),
        loadDensity(profileId),
        loadReducedMotion(profileId),
        loadFontScale(profileId),
        loadHighContrast(profileId),
        loadLargeHitAreas(profileId),
        loadPongSpin(profileId),
        loadAllowNetwork(profileId),
        loadHaptics(profileId),
      ]);

      if (cancelled) {
        hydrationRef.current = false;
        return;
      }

      setAccent(nextAccent);
      setWallpaper(nextWallpaper);
      setDensity((nextDensity as Density) ?? (defaults.density as Density));
      setReducedMotion(nextReducedMotion);
      setFontScale(nextFontScale);
      setHighContrast(nextHighContrast);
      setLargeHitAreas(nextLargeHitAreas);
      setPongSpin(nextPongSpin);
      setAllowNetwork(nextAllowNetwork);
      setHaptics(nextHaptics);

      const finalTheme = loadTheme(profileId);
      if (!userThemeRef.current) {
        setThemeState(finalTheme);
      }
      const themeToPersist = userThemeRef.current ? themeRef.current : finalTheme;
      saveTheme(themeToPersist, profileId);
      hydrationRef.current = false;
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    if (hydrationRef.current) return;
    saveTheme(theme, profileId);
  }, [theme, profileId]);

  const handleThemeChange = (next: string) => {
    userThemeRef.current = true;
    setThemeState(next);
  };

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
    if (!hydrationRef.current) {
      saveAccent(accent, profileId);
    }
  }, [accent, profileId]);

  useEffect(() => {
    if (hydrationRef.current) return;
    saveWallpaper(wallpaper, profileId);
  }, [wallpaper, profileId]);

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
    if (!hydrationRef.current) {
      saveDensity(density, profileId);
    }
  }, [density, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    if (!hydrationRef.current) {
      saveReducedMotion(reducedMotion, profileId);
    }
  }, [reducedMotion, profileId]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-multiplier', fontScale.toString());
    if (!hydrationRef.current) {
      saveFontScale(fontScale, profileId);
    }
  }, [fontScale, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    if (!hydrationRef.current) {
      saveHighContrast(highContrast, profileId);
    }
  }, [highContrast, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-hit-area', largeHitAreas);
    if (!hydrationRef.current) {
      saveLargeHitAreas(largeHitAreas, profileId);
    }
  }, [largeHitAreas, profileId]);

  useEffect(() => {
    if (!hydrationRef.current) {
      savePongSpin(pongSpin, profileId);
    }
  }, [pongSpin, profileId]);

  useEffect(() => {
    if (!hydrationRef.current) {
      saveAllowNetwork(allowNetwork, profileId);
    }
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
  }, [allowNetwork, profileId]);

  useEffect(() => {
    if (!hydrationRef.current) {
      saveHaptics(haptics, profileId);
    }
  }, [haptics, profileId]);

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
        hydrated,
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
        setTheme: handleThemeChange,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

