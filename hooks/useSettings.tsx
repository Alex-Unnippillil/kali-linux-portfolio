import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  Dispatch,
  SetStateAction,
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
  getWallpaperRotationInterval as loadRotationInterval,
  setWallpaperRotationInterval as saveRotationInterval,
  getWallpaperRotationPlaylist as loadRotationPlaylist,
  setWallpaperRotationPlaylist as saveRotationPlaylist,
  getWallpaperRotationTimestamp as loadRotationTimestamp,
  setWallpaperRotationTimestamp as saveRotationTimestamp,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
type Density = 'regular' | 'compact';

const getNextWallpaperFromPlaylist = (current: string, playlist: string[]): string => {
  if (playlist.length === 0) return current;
  const index = playlist.indexOf(current);
  if (index === -1) {
    return playlist[0];
  }
  return playlist[(index + 1) % playlist.length];
};

const sanitizePlaylist = (playlist: string[]): string[] =>
  Array.from(
    new Set(
      playlist.filter((item) => typeof item === 'string' && item.trim().length > 0)
    )
  );

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
  rotationIntervalMinutes: number;
  rotationPlaylist: string[];
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
  setRotationIntervalMinutes: Dispatch<SetStateAction<number>>;
  setRotationPlaylist: Dispatch<SetStateAction<string[]>>;
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
  rotationIntervalMinutes: defaults.rotationIntervalMinutes,
  rotationPlaylist: defaults.rotationPlaylist,
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
  setRotationIntervalMinutes: (() => {}) as Dispatch<SetStateAction<number>>,
  setRotationPlaylist: (() => {}) as Dispatch<SetStateAction<string[]>>,
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
  const [rotationIntervalMinutes, setRotationIntervalMinutes] = useState<number>(
    defaults.rotationIntervalMinutes
  );
  const [rotationPlaylist, setRotationPlaylist] = useState<string[]>(defaults.rotationPlaylist);
  const fetchRef = useRef<typeof fetch | null>(null);
  const lastRotationRef = useRef<number | null>(null);
  const initialWallpaperRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const wallpaperRef = useRef<string>(defaults.wallpaper);

  useEffect(() => {
    (async () => {
      const [
        accentValue,
        wallpaperValue,
        useKaliValue,
        densityValue,
        reducedMotionValue,
        fontScaleValue,
        highContrastValue,
        largeHitAreasValue,
        pongSpinValue,
        allowNetworkValue,
        hapticsValue,
        rotationIntervalValue,
        rotationPlaylistValue,
        rotationTimestamp,
      ] = await Promise.all([
        loadAccent(),
        loadWallpaper(),
        loadUseKaliWallpaper(),
        loadDensity(),
        loadReducedMotion(),
        loadFontScale(),
        loadHighContrast(),
        loadLargeHitAreas(),
        loadPongSpin(),
        loadAllowNetwork(),
        loadHaptics(),
        loadRotationInterval(),
        loadRotationPlaylist(),
        loadRotationTimestamp(),
      ]);

      const sanitizedPlaylist = sanitizePlaylist(rotationPlaylistValue);
      const resolvedInterval = Number.isFinite(rotationIntervalValue)
        ? rotationIntervalValue
        : defaults.rotationIntervalMinutes;

      setAccent(accentValue);
      setUseKaliWallpaper(useKaliValue);
      setDensity(densityValue as Density);
      setReducedMotion(reducedMotionValue);
      setFontScale(fontScaleValue);
      setHighContrast(highContrastValue);
      setLargeHitAreas(largeHitAreasValue);
      setPongSpin(pongSpinValue);
      setAllowNetwork(allowNetworkValue);
      setHaptics(hapticsValue);
      setRotationIntervalMinutes(resolvedInterval);
      setRotationPlaylist(sanitizedPlaylist);
      setTheme(loadTheme());

      let resolvedWallpaper = wallpaperValue;
      const now = Date.now();
      lastRotationRef.current = rotationTimestamp;

      if (
        resolvedInterval > 0 &&
        sanitizedPlaylist.length > 0 &&
        rotationTimestamp !== null &&
        now - rotationTimestamp >= resolvedInterval * 60 * 1000
      ) {
        resolvedWallpaper = getNextWallpaperFromPlaylist(resolvedWallpaper, sanitizedPlaylist);
        lastRotationRef.current = now;
        await saveRotationTimestamp(now);
      }

      setWallpaper(resolvedWallpaper);
      hasLoadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    wallpaperRef.current = wallpaper;
  }, [wallpaper]);

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

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveRotationInterval(rotationIntervalMinutes);
    if (rotationIntervalMinutes > 0 && lastRotationRef.current === null) {
      const now = Date.now();
      lastRotationRef.current = now;
      void saveRotationTimestamp(now);
    }
  }, [rotationIntervalMinutes]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const sanitized = sanitizePlaylist(rotationPlaylist);
    if (
      sanitized.length !== rotationPlaylist.length ||
      sanitized.some((item, index) => item !== rotationPlaylist[index])
    ) {
      setRotationPlaylist(sanitized);
      return;
    }
    saveRotationPlaylist(sanitized);
  }, [rotationPlaylist]);

  useEffect(() => {
    if (initialWallpaperRef.current) {
      initialWallpaperRef.current = false;
      return;
    }
    if (!hasLoadedRef.current) return;
    const now = Date.now();
    lastRotationRef.current = now;
    void saveRotationTimestamp(now);
  }, [wallpaper]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const playlist = sanitizePlaylist(rotationPlaylist);
    if (rotationIntervalMinutes <= 0 || playlist.length === 0) return;

    const intervalId = window.setInterval(() => {
      if (rotationIntervalMinutes <= 0 || playlist.length === 0) return;
      const lastRotation = lastRotationRef.current;
      const now = Date.now();
      if (lastRotation !== null && now - lastRotation < rotationIntervalMinutes * 60 * 1000) {
        return;
      }
      const nextWallpaper = getNextWallpaperFromPlaylist(wallpaperRef.current, playlist);
      if (!nextWallpaper) return;
      setWallpaper(nextWallpaper);
      lastRotationRef.current = now;
      void saveRotationTimestamp(now);
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [rotationIntervalMinutes, rotationPlaylist]);

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
        rotationIntervalMinutes,
        rotationPlaylist,
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
        setRotationIntervalMinutes,
        setRotationPlaylist,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

