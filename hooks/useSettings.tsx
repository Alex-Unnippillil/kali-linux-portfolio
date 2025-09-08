import { isBrowser } from '@/utils/env';
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import usePersistentState from './usePersistentState';
import { loadWallpaper } from '../lib/wallpaper';
import {
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
  getNetworkTime as loadNetworkTime,
  setNetworkTime as saveNetworkTime,
  getSymbolicTrayIcons as loadSymbolicTrayIcons,
  setSymbolicTrayIcons as saveSymbolicTrayIcons,
  defaults,
} from '../utils/settingsStore';
import { THEME_KEY, getTheme as getStoredTheme, setTheme as applyTheme } from '../utils/theme';
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

interface SettingsContextValue {
  accent: string;
  autoAccent: boolean;
  wallpaper: string;
  density: Density;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  networkTime: boolean;
  theme: string;
  symbolicTrayIcons: boolean;
  setAccent: (accent: string) => void;
  setAutoAccent: (value: boolean) => void;
  setWallpaper: (wallpaper: string) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  setHighContrast: (value: boolean) => void;
  setLargeHitAreas: (value: boolean) => void;
  setPongSpin: (value: boolean) => void;
  setAllowNetwork: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setNetworkTime: (value: boolean) => void;
  setTheme: (value: string) => void;
  setSymbolicTrayIcons: (value: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  autoAccent: defaults.autoAccent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as Density,
  reducedMotion: defaults.reducedMotion,
  fontScale: defaults.fontScale,
  highContrast: defaults.highContrast,
  largeHitAreas: defaults.largeHitAreas,
  pongSpin: defaults.pongSpin,
  allowNetwork: defaults.allowNetwork,
  haptics: defaults.haptics,
  networkTime: defaults.networkTime,
  theme: 'default',
  symbolicTrayIcons: defaults.symbolicTrayIcons,
  setAccent: () => {},
  setAutoAccent: () => {},
  setWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setFontScale: () => {},
  setHighContrast: () => {},
  setLargeHitAreas: () => {},
  setPongSpin: () => {},
  setAllowNetwork: () => {},
  setHaptics: () => {},
  setNetworkTime: () => {},
  setTheme: () => {},
  setSymbolicTrayIcons: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = usePersistentState<string>(
    'accent',
    defaults.accent,
    (v): v is string => typeof v === 'string',
  );
  const [autoAccent, setAutoAccent] = usePersistentState<boolean>(
    'auto-accent',
    defaults.autoAccent,
    (v): v is boolean => typeof v === 'boolean',
  );
  const [wallpaper, setWallpaper] = usePersistentState<string>(
    'bg-image',
    defaults.wallpaper,
    (v): v is string => typeof v === 'string',
  );
  const [theme, setTheme] = usePersistentState<string>(
    THEME_KEY,
    () => getStoredTheme(),
    (v): v is string => typeof v === 'string',
  );
  const [density, setDensity] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaults.reducedMotion);
  const [fontScale, setFontScale] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrast] = useState<boolean>(defaults.highContrast);
  const [largeHitAreas, setLargeHitAreas] = useState<boolean>(defaults.largeHitAreas);
  const [pongSpin, setPongSpin] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetwork] = useState<boolean>(defaults.allowNetwork);
  const [haptics, setHaptics] = useState<boolean>(defaults.haptics);
  const [networkTime, setNetworkTime] = useState<boolean>(defaults.networkTime);
  const [symbolicTrayIcons, setSymbolicTrayIcons] = useState<boolean>(defaults.symbolicTrayIcons);
  const fetchRef = useRef<typeof fetch | null>(null);

  const [rotationMode] = usePersistentState<'off' | 'daily' | 'login'>(
    'bg-slideshow-mode',
    'off',
    (v): v is 'off' | 'daily' | 'login' =>
      v === 'off' || v === 'daily' || v === 'login',
  );
  const [rotationSet] = usePersistentState<string[]>(
    'bg-slideshow-selected',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  );
  const [rotationIndex, setRotationIndex] = usePersistentState<number>(
    'bg-slideshow-index',
    0,
    (v): v is number => typeof v === 'number',
  );
  const [rotationDate, setRotationDate] = usePersistentState<string>(
    'bg-slideshow-date',
    '',
    (v): v is string => typeof v === 'string',
  );

  useEffect(() => {
    (async () => {
      setDensity((await loadDensity()) as Density);
      setReducedMotion(await loadReducedMotion());
      setFontScale(await loadFontScale());
      setHighContrast(await loadHighContrast());
      setLargeHitAreas(await loadLargeHitAreas());
      setPongSpin(await loadPongSpin());
      setAllowNetwork(await loadAllowNetwork());
      setHaptics(await loadHaptics());
      setNetworkTime(await loadNetworkTime());
      setSymbolicTrayIcons(await loadSymbolicTrayIcons());
    })();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const applied = await loadWallpaper(wallpaper, autoAccent ? undefined : accent);
      if (autoAccent && applied) setAccent(applied);
    })();
  }, [wallpaper, accent, autoAccent]);


  useEffect(() => {
    if (rotationMode === 'off') return;
    if (!rotationSet.length) return;
    const index = rotationIndex % rotationSet.length;
    const base = rotationSet[index].replace(/\.[^.]+$/, '');
    if (rotationMode === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      if (rotationDate === today) return;
      setWallpaper(base);
      setRotationIndex((index + 1) % rotationSet.length);
      setRotationDate(today);
    } else if (rotationMode === 'login') {
      setWallpaper(base);
      setRotationIndex((index + 1) % rotationSet.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotationMode, rotationSet]);

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
    if (!isBrowser()) return;
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

  useEffect(() => {
    saveNetworkTime(networkTime);
  }, [networkTime]);

  useEffect(() => {
    saveSymbolicTrayIcons(symbolicTrayIcons);
  }, [symbolicTrayIcons]);

  return (
    <SettingsContext.Provider
      value={{
        accent,
        autoAccent,
        wallpaper,
        density,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
        networkTime,
        symbolicTrayIcons,
        theme,
        setAccent,
        setAutoAccent,
        setWallpaper,
        setDensity,
        setReducedMotion,
        setFontScale,
        setHighContrast,
        setLargeHitAreas,
        setPongSpin,
        setAllowNetwork,
        setHaptics,
        setNetworkTime,
        setTheme,
        setSymbolicTrayIcons,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

