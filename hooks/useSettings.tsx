import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
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
  getNotificationPreferences as loadNotificationPreferences,
  setNotificationPreferences as persistNotificationPreferences,
  defaults,
  defaultNotificationPreference as notificationPreferenceDefaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
type Density = 'regular' | 'compact';

export type NotificationPreference = {
  banners: boolean;
  sounds: boolean;
  badges: boolean;
};

const FALLBACK_NOTIFICATION_PREFERENCE: NotificationPreference = {
  banners: notificationPreferenceDefaults?.banners ?? true,
  sounds: notificationPreferenceDefaults?.sounds ?? true,
  badges: notificationPreferenceDefaults?.badges ?? true,
};

const cloneFallbackPreference = (): NotificationPreference => ({
  ...FALLBACK_NOTIFICATION_PREFERENCE,
});

const sanitizeNotificationPreference = (
  pref?: Partial<NotificationPreference> | null,
): NotificationPreference => {
  const base = cloneFallbackPreference();
  if (!pref) return base;
  const normalized: NotificationPreference = {
    banners:
      typeof pref.banners === 'boolean' ? pref.banners : base.banners,
    sounds: typeof pref.sounds === 'boolean' ? pref.sounds : base.sounds,
    badges: typeof pref.badges === 'boolean' ? pref.badges : base.badges,
  };
  if (!normalized.banners) {
    normalized.sounds = false;
  }
  return normalized;
};

const isDefaultNotificationPreference = (pref: NotificationPreference) =>
  pref.banners === FALLBACK_NOTIFICATION_PREFERENCE.banners &&
  pref.sounds === FALLBACK_NOTIFICATION_PREFERENCE.sounds &&
  pref.badges === FALLBACK_NOTIFICATION_PREFERENCE.badges;

const normalizePreferencesRecord = (
  prefs?: Record<string, Partial<NotificationPreference> | NotificationPreference>,
): Record<string, NotificationPreference> => {
  if (!prefs) return {};
  return Object.entries(prefs).reduce<Record<string, NotificationPreference>>(
    (acc, [appId, pref]) => {
      const normalized = sanitizeNotificationPreference(pref);
      if (!isDefaultNotificationPreference(normalized)) {
        acc[appId] = normalized;
      }
      return acc;
    },
    {},
  );
};

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
  notificationPreferences: Record<string, NotificationPreference>;
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
  getNotificationPreference: (appId: string) => NotificationPreference;
  updateNotificationPreference: (
    appId: string,
    updates: Partial<NotificationPreference>,
  ) => void;
  resetNotificationPreference: (appId?: string) => void;
  setNotificationPreferences: (
    prefs: Record<string, Partial<NotificationPreference>>,
  ) => void;
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
  notificationPreferences: normalizePreferencesRecord(
    defaults.notificationPreferences,
  ),
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
  getNotificationPreference: () => cloneFallbackPreference(),
  updateNotificationPreference: () => {},
  resetNotificationPreference: () => {},
  setNotificationPreferences: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
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
  const [theme, setTheme] = useState<string>(() => loadTheme());
  const [notificationPreferences, setNotificationPreferencesState] = useState<
    Record<string, NotificationPreference>
  >(() => normalizePreferencesRecord(defaults.notificationPreferences));
  const fetchRef = useRef<typeof fetch | null>(null);
  const hasLoadedNotificationPreferences = useRef(false);

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
    (async () => {
      try {
        const loaded = await loadNotificationPreferences();
        if (!cancelled) {
          setNotificationPreferencesState(
            normalizePreferencesRecord(loaded),
          );
        }
      } finally {
        if (!cancelled) {
          hasLoadedNotificationPreferences.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (!hasLoadedNotificationPreferences.current) return;
    void persistNotificationPreferences(notificationPreferences);
  }, [notificationPreferences]);

  const getNotificationPreference = useCallback(
    (appId: string) => sanitizeNotificationPreference(notificationPreferences[appId]),
    [notificationPreferences],
  );

  const updateNotificationPreference = useCallback(
    (appId: string, updates: Partial<NotificationPreference>) => {
      setNotificationPreferencesState(prev => {
        const current = sanitizeNotificationPreference(prev[appId]);
        const next = sanitizeNotificationPreference({ ...current, ...updates });
        if (isDefaultNotificationPreference(next)) {
          if (!(appId in prev)) return prev;
          const { [appId]: _removed, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [appId]: next,
        };
      });
    },
    [],
  );

  const resetNotificationPreference = useCallback((appId?: string) => {
    if (!appId) {
      setNotificationPreferencesState({});
      return;
    }
    setNotificationPreferencesState(prev => {
      if (!(appId in prev)) return prev;
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  }, []);

  const setNotificationPreferences = useCallback(
    (prefs: Record<string, Partial<NotificationPreference>>) => {
      setNotificationPreferencesState(normalizePreferencesRecord(prefs));
    },
    [],
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
        notificationPreferences,
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
        getNotificationPreference,
        updateNotificationPreference,
        resetNotificationPreference,
        setNotificationPreferences,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

