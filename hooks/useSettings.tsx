import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useMemo,
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

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

type WallpaperAsset = {
  id: string;
  file: string;
};

interface SettingsContextValue {
  accent: string;
  wallpaper: string;
  bgImageName: string;
  bgImageFile: string | null;
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
  wallpapers: WallpaperAsset[];
  wallpaperOverride: string | null;
  setWallpaperOverride: (value: string | null) => void;
  randomDailyWallpaperId: string | null;
  randomDailyWallpaperFile: string | null;
}

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  bgImageName: defaults.wallpaper,
  bgImageFile: null,
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
  wallpapers: [],
  wallpaperOverride: null,
  setWallpaperOverride: () => {},
  randomDailyWallpaperId: null,
  randomDailyWallpaperFile: null,
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
  const [wallpapers, setWallpapers] = useState<WallpaperAsset[]>([]);
  const [wallpaperOverride, setWallpaperOverride] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState<string>(() => getTodayKey());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const normalize = (items: unknown): WallpaperAsset[] => {
      if (!Array.isArray(items)) return [];
      const normalized: WallpaperAsset[] = [];
      items.forEach((item) => {
        if (item && typeof item === 'object' && 'id' in item && 'file' in item) {
          const id = String((item as { id: unknown }).id);
          const file = String((item as { file: unknown }).file);
          normalized.push({ id, file });
        } else if (typeof item === 'string') {
          const id = item.replace(/\.[^.]+$/, '');
          normalized.push({ id, file: item });
        }
      });
      const uniqueMap = new Map<string, WallpaperAsset>();
      normalized.forEach((entry) => {
        if (!uniqueMap.has(entry.id)) {
          uniqueMap.set(entry.id, entry);
        }
      });
      return Array.from(uniqueMap.values()).sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }),
      );
    };

    const loadWallpapers = async () => {
      try {
        const response = await fetch('/api/wallpapers');
        if (!response.ok) throw new Error('Failed to load wallpapers');
        const data = await response.json();
        if (!cancelled) {
          setWallpapers(normalize(data));
        }
      } catch {
        if (!cancelled) setWallpapers([]);
      }
    };

    loadWallpapers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateKey = () => {
      const key = getTodayKey();
      setTodayKey((prev) => (prev === key ? prev : key));
    };
    updateKey();
    const timer = window.setInterval(updateKey, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

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

  const wallpaperMap = useMemo(() => {
    const map = new Map<string, WallpaperAsset>();
    wallpapers.forEach((entry) => {
      map.set(entry.id, entry);
    });
    return map;
  }, [wallpapers]);

  useEffect(() => {
    if (wallpaper === 'random-daily') return;
    if (wallpapers.length === 0) return;
    if (wallpaperMap.has(wallpaper)) return;
    const fallback = wallpaperMap.get(defaults.wallpaper) ?? wallpapers[0] ?? null;
    if (fallback) setWallpaper(fallback.id);
  }, [wallpaper, wallpapers, wallpaperMap]);

  const randomDailyWallpaperId = useMemo(() => {
    if (wallpapers.length === 0) return defaults.wallpaper ?? null;
    const hashInput = `${todayKey}:${wallpapers.map((w) => w.id).join('|')}`;
    const index = hashString(hashInput) % wallpapers.length;
    return wallpapers[index]?.id ?? wallpapers[0]?.id ?? null;
  }, [todayKey, wallpapers]);

  const resolveWallpaperId = useMemo(() => {
    if (wallpaperOverride) return wallpaperOverride;
    if (useKaliWallpaper) return 'kali-gradient';
    if (wallpaper === 'random-daily') return randomDailyWallpaperId ?? defaults.wallpaper;
    return wallpaper;
  }, [wallpaper, wallpaperOverride, useKaliWallpaper, randomDailyWallpaperId]);

  const resolveFile = useMemo(() => {
    if (!resolveWallpaperId || resolveWallpaperId === 'kali-gradient') return null;
    const asset = wallpaperMap.get(resolveWallpaperId);
    if (asset) return asset.file;
    return `${resolveWallpaperId}.webp`;
  }, [resolveWallpaperId, wallpaperMap]);

  const randomDailyWallpaperFile = useMemo(() => {
    if (!randomDailyWallpaperId) return null;
    const asset = wallpaperMap.get(randomDailyWallpaperId);
    if (asset) return asset.file;
    return `${randomDailyWallpaperId}.webp`;
  }, [randomDailyWallpaperId, wallpaperMap]);

  const updateWallpaperOverride = (value: string | null) => {
    setWallpaperOverride(value);
  };

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

  const bgImageName = resolveWallpaperId ?? defaults.wallpaper;

  return (
    <SettingsContext.Provider
      value={{
        accent,
        wallpaper,
        bgImageName,
        bgImageFile: resolveFile,
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
        wallpapers,
        wallpaperOverride,
        setWallpaperOverride: updateWallpaperOverride,
        randomDailyWallpaperId,
        randomDailyWallpaperFile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

