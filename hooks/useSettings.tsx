import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useRef,
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
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
import {
  recordSettingsMutation,
  loadSettingsHistory,
  persistSettingsHistory,
  type SettingsHistoryEntry,
} from '../middleware/settingsHistory';
import {
  persistSettingsSnapshot,
  type SettingsSnapshot,
} from '../utils/settings';

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
  history: SettingsHistoryEntry[];
  recentChange: SettingsHistoryEntry | null;
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
  undoHistoryEntry: (id: string) => Promise<void>;
  clearRecentChange: () => void;
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
  history: [],
  recentChange: null,
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
  undoHistoryEntry: async () => {},
  clearRecentChange: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaperState] = useState<string>(defaults.wallpaper);
  const [density, setDensityState] = useState<Density>(
    defaults.density as Density,
  );
  const [reducedMotion, setReducedMotionState] = useState<boolean>(
    defaults.reducedMotion,
  );
  const [fontScale, setFontScaleState] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrastState] = useState<boolean>(
    defaults.highContrast,
  );
  const [largeHitAreas, setLargeHitAreasState] = useState<boolean>(
    defaults.largeHitAreas,
  );
  const [pongSpin, setPongSpinState] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetworkState] = useState<boolean>(
    defaults.allowNetwork,
  );
  const [haptics, setHapticsState] = useState<boolean>(defaults.haptics);
  const [theme, setThemeState] = useState<string>(() => loadTheme());
  const [history, setHistory] = useState<SettingsHistoryEntry[]>([]);
  const [recentChange, setRecentChange] =
    useState<SettingsHistoryEntry | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);

  const snapshotRef = useRef<SettingsSnapshot | null>(null);
  const historyRef = useRef<SettingsHistoryEntry[]>([]);
  const fetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          accentValue,
          wallpaperValue,
          densityValue,
          reducedMotionValue,
          fontScaleValue,
          highContrastValue,
          largeHitAreasValue,
          pongSpinValue,
          allowNetworkValue,
          hapticsValue,
        ] = await Promise.all([
          loadAccent(),
          loadWallpaper(),
          loadDensity(),
          loadReducedMotion(),
          loadFontScale(),
          loadHighContrast(),
          loadLargeHitAreas(),
          loadPongSpin(),
          loadAllowNetwork(),
          loadHaptics(),
        ]);
        if (cancelled) return;
        setAccentState(accentValue);
        setWallpaperState(wallpaperValue);
        setDensityState(densityValue as Density);
        setReducedMotionState(reducedMotionValue);
        setFontScaleState(fontScaleValue);
        setHighContrastState(highContrastValue);
        setLargeHitAreasState(largeHitAreasValue);
        setPongSpinState(pongSpinValue);
        setAllowNetworkState(allowNetworkValue);
        setHapticsState(hapticsValue);
        setThemeState(loadTheme());
      } catch (error) {
        console.error('Failed to load settings from storage', error);
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedHistory = await loadSettingsHistory();
        if (cancelled) return;
        historyRef.current = storedHistory;
        setHistory(storedHistory);
      } catch (error) {
        console.error('Failed to load settings history', error);
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildSnapshot = useCallback(
    (): SettingsSnapshot => ({
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
    }),
    [
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
    ],
  );

  useEffect(() => {
    if (!initialized) return;
    snapshotRef.current = buildSnapshot();
  }, [buildSnapshot, initialized]);

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
    document.documentElement.style.setProperty(
      '--font-multiplier',
      fontScale.toString(),
    );
    saveFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    saveHighContrast(highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'large-hit-area',
      largeHitAreas,
    );
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

  const applyStateUpdates = useCallback(
    (updates: Partial<SettingsSnapshot>) => {
      if (updates.accent !== undefined) setAccentState(updates.accent);
      if (updates.wallpaper !== undefined) setWallpaperState(updates.wallpaper);
      if (updates.density !== undefined)
        setDensityState(updates.density as Density);
      if (updates.reducedMotion !== undefined)
        setReducedMotionState(updates.reducedMotion);
      if (updates.fontScale !== undefined) setFontScaleState(updates.fontScale);
      if (updates.highContrast !== undefined)
        setHighContrastState(updates.highContrast);
      if (updates.largeHitAreas !== undefined)
        setLargeHitAreasState(updates.largeHitAreas);
      if (updates.pongSpin !== undefined) setPongSpinState(updates.pongSpin);
      if (updates.allowNetwork !== undefined)
        setAllowNetworkState(updates.allowNetwork);
      if (updates.haptics !== undefined) setHapticsState(updates.haptics);
      if (updates.theme !== undefined) setThemeState(updates.theme);
    },
    [],
  );

  const commitChange = useCallback(
    (updates: Partial<SettingsSnapshot>, summary: string, source: string) => {
      const previous = snapshotRef.current ?? buildSnapshot();
      const next: SettingsSnapshot = { ...previous, ...updates };
      applyStateUpdates(updates);
      snapshotRef.current = next;

      if (!initialized) return;

      void recordSettingsMutation({
        before: previous,
        after: next,
        summary,
        source,
        history: historyReady ? historyRef.current : undefined,
      })
        .then(({ entry, history: updatedHistory }) => {
          if (!entry) return;
          historyRef.current = updatedHistory;
          setHistory(updatedHistory);
          setRecentChange(entry);
        })
        .catch((error) => {
          console.error('Failed to record settings history', error);
        });
    },
    [applyStateUpdates, buildSnapshot, historyReady, initialized],
  );

  const setAccent = useCallback(
    (value: string) => {
      commitChange({ accent: value }, 'Accent color updated', 'accent');
    },
    [commitChange],
  );

  const setWallpaper = useCallback(
    (value: string) => {
      commitChange(
        { wallpaper: value },
        `Wallpaper changed to ${value}`,
        'wallpaper',
      );
    },
    [commitChange],
  );

  const setDensity = useCallback(
    (value: Density) => {
      commitChange(
        { density: value },
        `Interface density set to ${value}`,
        'density',
      );
    },
    [commitChange],
  );

  const setReducedMotion = useCallback(
    (value: boolean) => {
      commitChange(
        { reducedMotion: value },
        `Reduced motion ${value ? 'enabled' : 'disabled'}`,
        'reducedMotion',
      );
    },
    [commitChange],
  );

  const setFontScale = useCallback(
    (value: number) => {
      commitChange(
        { fontScale: value },
        `Font scale set to ${value.toFixed(2)}`,
        'fontScale',
      );
    },
    [commitChange],
  );

  const setHighContrast = useCallback(
    (value: boolean) => {
      commitChange(
        { highContrast: value },
        `High contrast ${value ? 'enabled' : 'disabled'}`,
        'highContrast',
      );
    },
    [commitChange],
  );

  const setLargeHitAreas = useCallback(
    (value: boolean) => {
      commitChange(
        { largeHitAreas: value },
        `Large hit areas ${value ? 'enabled' : 'disabled'}`,
        'largeHitAreas',
      );
    },
    [commitChange],
  );

  const setPongSpin = useCallback(
    (value: boolean) => {
      commitChange(
        { pongSpin: value },
        `Pong spin ${value ? 'enabled' : 'disabled'}`,
        'pongSpin',
      );
    },
    [commitChange],
  );

  const setAllowNetwork = useCallback(
    (value: boolean) => {
      commitChange(
        { allowNetwork: value },
        `Network requests ${value ? 'enabled' : 'blocked'}`,
        'allowNetwork',
      );
    },
    [commitChange],
  );

  const setHaptics = useCallback(
    (value: boolean) => {
      commitChange(
        { haptics: value },
        `Haptics ${value ? 'enabled' : 'disabled'}`,
        'haptics',
      );
    },
    [commitChange],
  );

  const setTheme = useCallback(
    (value: string) => {
      commitChange({ theme: value }, `Theme switched to ${value}`, 'theme');
    },
    [commitChange],
  );

  const undoHistoryEntry = useCallback(
    async (id: string) => {
      const entry = historyRef.current.find((item) => item.id === id);
      if (!entry || entry.undone) return;

      const snapshot = { ...entry.before } as SettingsSnapshot;
      applyStateUpdates(snapshot);
      snapshotRef.current = snapshot;
      setRecentChange((current) => (current?.id === id ? null : current));

      try {
        await persistSettingsSnapshot(snapshot);
      } catch (error) {
        console.error('Failed to persist settings during undo', error);
      }

      const updatedHistory = historyRef.current.map((item) =>
        item.id === id
          ? { ...item, undone: true, undoneAt: new Date().toISOString() }
          : item,
      );
      historyRef.current = updatedHistory;
      setHistory(updatedHistory);
      try {
        await persistSettingsHistory(updatedHistory);
      } catch (error) {
        console.error('Failed to persist settings history', error);
      }
    },
    [applyStateUpdates],
  );

  const clearRecentChange = useCallback(() => {
    setRecentChange(null);
  }, []);

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
        history,
        recentChange,
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
        undoHistoryEntry,
        clearRecentChange,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

