import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
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
import settingsSync, {
  resolveConflictSelection,
  type SettingsConflict,
  type SettingsMergeOption,
  type SettingsMergeOptionId,
  type SettingsPayload,
  type SettingsSnapshot,
  type SyncStrategy,
} from '../utils/settingsSync';

type Density = 'regular' | 'compact';
type SettingsSyncStatus = 'idle' | 'syncing' | 'conflict' | 'error';

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
  syncStatus: SettingsSyncStatus;
  syncError: string | null;
  syncConflict: SettingsConflict | null;
  syncOptions: SettingsMergeOption[];
  lastSyncedAt: number | null;
  resolveSyncConflict: (
    optionId: SettingsMergeOptionId,
    overrides?: Partial<SettingsPayload>,
  ) => Promise<void>;
  forceSync: (strategy?: SyncStrategy) => Promise<void>;
}

const defaultContextValue: SettingsContextValue = {
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
  syncStatus: 'idle',
  syncError: null,
  syncConflict: null,
  syncOptions: [],
  lastSyncedAt: null,
  resolveSyncConflict: async () => {},
  forceSync: async () => {},
};

export const SettingsContext = createContext<SettingsContextValue>(
  defaultContextValue,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initialTheme = useRef<string>(loadTheme()).current;
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [density, setDensity] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    defaults.reducedMotion,
  );
  const [fontScale, setFontScale] = useState<number>(defaults.fontScale);
  const [highContrast, setHighContrast] = useState<boolean>(
    defaults.highContrast,
  );
  const [largeHitAreas, setLargeHitAreas] = useState<boolean>(
    defaults.largeHitAreas,
  );
  const [pongSpin, setPongSpin] = useState<boolean>(defaults.pongSpin);
  const [allowNetwork, setAllowNetwork] = useState<boolean>(
    defaults.allowNetwork,
  );
  const [haptics, setHaptics] = useState<boolean>(defaults.haptics);
  const [theme, setTheme] = useState<string>(initialTheme);
  const fetchRef = useRef<typeof fetch | null>(null);
  const baseSnapshotRef = useRef<SettingsSnapshot | null>(null);
  const skipNextSyncRef = useRef(false);
  const latestSettingsRef = useRef<SettingsPayload>({
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
    theme: initialTheme,
  });
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isMountedRef = useRef(true);
  const [syncStatus, setSyncStatus] = useState<SettingsSyncStatus>('syncing');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<SettingsConflict | null>(
    null,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const applySettings = useCallback(
    (payload: SettingsPayload) => {
      skipNextSyncRef.current = true;
      latestSettingsRef.current = { ...payload };
      setAccent(payload.accent);
      setWallpaper(payload.wallpaper);
      setDensity(payload.density as Density);
      setReducedMotion(payload.reducedMotion);
      setFontScale(payload.fontScale);
      setHighContrast(payload.highContrast);
      setLargeHitAreas(payload.largeHitAreas);
      setPongSpin(payload.pongSpin);
      setAllowNetwork(payload.allowNetwork);
      setHaptics(payload.haptics);
      setTheme(payload.theme);
    },
    [],
  );

  const syncWithRemote = useCallback(
    async (
      strategy: SyncStrategy = 'manual',
      explicitData?: SettingsPayload,
      explicitBase?: SettingsSnapshot,
    ) => {
      syncQueueRef.current = syncQueueRef.current.then(async () => {
        const baseSnapshot = explicitBase ?? baseSnapshotRef.current;
        if (!baseSnapshot) return;
        const data = explicitData ?? latestSettingsRef.current;
        if (strategy !== 'manual' || !syncConflict) {
          setSyncStatus('syncing');
        }
        setSyncError(null);
        try {
          const result = await settingsSync.save(data, {
            strategy,
            baseSnapshot,
          });
          if (!isMountedRef.current) return;
          if (result.ok) {
            baseSnapshotRef.current = result.snapshot;
            setLastSyncedAt(result.snapshot.updatedAt);
            setSyncConflict(null);
            setSyncStatus('idle');
          } else {
            setSyncConflict(result.conflict);
            setSyncStatus('conflict');
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          setSyncError(error instanceof Error ? error.message : 'Sync failed');
          setSyncStatus('error');
        }
      });
      return syncQueueRef.current;
    },
    [syncConflict],
  );

  useEffect(() => {
    (async () => {
      setAccent(await loadAccent());
      setWallpaper(await loadWallpaper());
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
    let cancelled = false;
    const initialise = async () => {
      try {
        const snapshot = await settingsSync.load();
        if (cancelled) return;
        baseSnapshotRef.current = snapshot;
        setLastSyncedAt(snapshot.updatedAt);
        applySettings(snapshot.data);
        setSyncStatus('idle');
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : 'Sync failed');
        setSyncStatus('error');
      }
    };

    initialise();

    const unsubscribe = settingsSync.subscribe((snapshot) => {
      if (cancelled) return;
      baseSnapshotRef.current = snapshot;
      setLastSyncedAt(snapshot.updatedAt);
      applySettings(snapshot.data);
      setSyncConflict(null);
      setSyncStatus('idle');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applySettings]);

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
    const payload: SettingsPayload = {
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
    };

    latestSettingsRef.current = payload;

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    if (!baseSnapshotRef.current || syncConflict) {
      return;
    }

    void syncWithRemote('manual');
  }, [
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
    syncConflict,
    syncWithRemote,
  ]);

  const resolveSyncConflict = useCallback(
    async (
      optionId: SettingsMergeOptionId,
      overrides?: Partial<SettingsPayload>,
    ) => {
      if (!syncConflict) return;
      const conflict = syncConflict;
      try {
        const resolved = resolveConflictSelection(conflict, optionId, overrides);
        applySettings(resolved);
        setSyncConflict(null);
        await syncWithRemote('manual', resolved, conflict.remote);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'Sync failed');
        setSyncStatus('error');
      }
    },
    [applySettings, syncConflict, syncWithRemote],
  );

  const forceSync = useCallback(
    async (strategy: SyncStrategy = 'last-write-wins') => {
      await syncWithRemote(strategy);
    },
    [syncWithRemote],
  );

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
        syncStatus,
        syncError,
        syncConflict,
        syncOptions: syncConflict?.options ?? [],
        lastSyncedAt,
        resolveSyncConflict,
        forceSync,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
