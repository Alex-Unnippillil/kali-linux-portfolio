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
  resetSettings,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme, isDarkTheme } from '../utils/theme';
import { useProfileSwitcher } from './useProfileSwitcher';
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
  const { activeProfileId, persistentProfileId, isGuest } = useProfileSwitcher();
  const profileId = activeProfileId;
  const persist = !isGuest;

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
  const [theme, setTheme] = useState<string>(() => (persist ? loadTheme(profileId) : 'default'));
  const fetchRef = useRef<typeof fetch | null>(null);
  const wasGuest = useRef(isGuest);

  useEffect(() => {
    let cancelled = false;
    if (!persist) {
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
      setTheme('default');
      return;
    }
    (async () => {
      const [
        accentValue,
        wallpaperValue,
        densityValue,
        reducedMotionValue,
        fontScaleValue,
        highContrastValue,
        largeHitValue,
        pongSpinValue,
        allowNetworkValue,
        hapticsValue,
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
      if (cancelled) return;
      setAccent(accentValue);
      setWallpaper(wallpaperValue);
      setDensity(densityValue as Density);
      setReducedMotion(reducedMotionValue);
      setFontScale(fontScaleValue);
      setHighContrast(highContrastValue);
      setLargeHitAreas(largeHitValue);
      setPongSpin(pongSpinValue);
      setAllowNetwork(allowNetworkValue);
      setHaptics(hapticsValue);
      setTheme(loadTheme(profileId));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileId, persist]);

  useEffect(() => {
    if (wasGuest.current && !isGuest) {
      (async () => {
        await resetSettings(persistentProfileId);
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
        setTheme('default');
      })().catch(() => {});
    }
    wasGuest.current = isGuest;
  }, [isGuest, persistentProfileId]);

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
    if (persist) {
      saveAccent(profileId, accent);
    }
  }, [accent, persist, profileId]);

  useEffect(() => {
    if (persist) {
      saveWallpaper(profileId, wallpaper);
    }
  }, [wallpaper, persist, profileId]);

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
    if (persist) {
      saveDensity(profileId, density);
    }
  }, [density, persist, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    if (persist) {
      saveReducedMotion(profileId, reducedMotion);
    }
  }, [reducedMotion, persist, profileId]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-multiplier', fontScale.toString());
    if (persist) {
      saveFontScale(profileId, fontScale);
    }
  }, [fontScale, persist, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    if (persist) {
      saveHighContrast(profileId, highContrast);
    }
  }, [highContrast, persist, profileId]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-hit-area', largeHitAreas);
    if (persist) {
      saveLargeHitAreas(profileId, largeHitAreas);
    }
  }, [largeHitAreas, persist, profileId]);

  useEffect(() => {
    if (persist) {
      savePongSpin(profileId, pongSpin);
    }
  }, [pongSpin, persist, profileId]);

  useEffect(() => {
    if (persist) {
      saveHaptics(profileId, haptics);
    }
  }, [haptics, persist, profileId]);

  useEffect(() => {
    if (persist) {
      saveAllowNetwork(profileId, allowNetwork);
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
  }, [allowNetwork, persist, profileId]);

  useEffect(() => {
    if (persist) {
      saveTheme(profileId, theme);
    } else {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', isDarkTheme(theme));
    }
  }, [theme, persist, profileId]);

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

