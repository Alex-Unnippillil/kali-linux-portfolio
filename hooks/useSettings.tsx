import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
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
  getDndSettings as loadDndSettings,
  setDndSettings as persistDndSettings,
  getDefaultDndSettings,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
type Density = 'regular' | 'compact';

export type DndOverride = 'on' | 'off' | null;

export interface DndSchedule {
  id: string;
  label: string;
  description?: string;
  start: string;
  end: string;
  days: number[];
  enabled: boolean;
}

interface DndSettings {
  override: DndOverride;
  schedules: DndSchedule[];
}

const cloneSchedules = (schedules: DndSchedule[]): DndSchedule[] =>
  schedules.map((schedule) => ({
    ...schedule,
    days: [...schedule.days],
  }));

const cloneDndSettings = (settings: DndSettings): DndSettings => ({
  override: settings.override,
  schedules: cloneSchedules(settings.schedules),
});

const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map((segment) => parseInt(segment, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const isScheduleActive = (schedule: DndSchedule, now: Date): boolean => {
  if (!schedule.enabled) return false;
  const minutesOfDay = now.getHours() * 60 + now.getMinutes();
  const start = parseTime(schedule.start);
  const end = parseTime(schedule.end);
  const days = schedule.days.length ? schedule.days : [0, 1, 2, 3, 4, 5, 6];
  const day = now.getDay();

  if (start === end) {
    return days.includes(day);
  }

  if (start < end) {
    return days.includes(day) && minutesOfDay >= start && minutesOfDay < end;
  }

  const previousDay = (day + 6) % 7;
  return (
    (days.includes(day) && minutesOfDay >= start) ||
    (days.includes(previousDay) && minutesOfDay < end)
  );
};

const isAnyScheduleActive = (schedules: DndSchedule[], now: Date = new Date()): boolean =>
  schedules.some((schedule) => isScheduleActive(schedule, now));

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
  dndActive: boolean;
  dndScheduleActive: boolean;
  dndOverride: DndOverride;
  dndSchedules: DndSchedule[];
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
  toggleDnd: () => void;
  setDndOverride: (value: DndOverride) => void;
  clearDndOverride: () => void;
  updateDndSchedule: (id: string, updates: Partial<Omit<DndSchedule, 'id'>>) => void;
}

const defaultDnd = cloneDndSettings(getDefaultDndSettings());

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
  dndActive: false,
  dndScheduleActive: false,
  dndOverride: defaultDnd.override,
  dndSchedules: defaultDnd.schedules,
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
  toggleDnd: () => {},
  setDndOverride: () => {},
  clearDndOverride: () => {},
  updateDndSchedule: () => {},
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
  const [dndSettings, setDndState] = useState<DndSettings>(() =>
    cloneDndSettings(defaultDnd)
  );
  const [dndScheduleActive, setDndScheduleActive] = useState<boolean>(false);
  const [dndLoaded, setDndLoaded] = useState<boolean>(false);
  const fetchRef = useRef<typeof fetch | null>(null);

  const computeScheduleActive = useCallback(
    () => isAnyScheduleActive(dndSettings.schedules, new Date()),
    [dndSettings.schedules]
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
      try {
        const loadedDnd = await loadDndSettings();
        const cloned = cloneDndSettings(loadedDnd);
        setDndState(cloned);
        setDndScheduleActive(isAnyScheduleActive(cloned.schedules));
      } finally {
        setDndLoaded(true);
      }
      setTheme(loadTheme());
    })();
  }, []);

  useEffect(() => {
    if (!dndLoaded) return;

    const update = () => {
      setDndScheduleActive(computeScheduleActive());
    };

    update();

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    timeoutId = setTimeout(() => {
      update();
      intervalId = setInterval(update, 60 * 1000);
    }, msUntilNextMinute);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [computeScheduleActive, dndLoaded]);

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
    if (!dndLoaded) return;
    persistDndSettings(dndSettings);
  }, [dndLoaded, dndSettings]);

  const dndActive =
    dndSettings.override === 'on'
      ? true
      : dndSettings.override === 'off'
        ? false
        : dndScheduleActive;

  const setDndOverride = useCallback((value: DndOverride) => {
    setDndState((prev) => ({
      ...prev,
      override: value,
    }));
  }, []);

  const clearDndOverride = useCallback(() => {
    setDndOverride(null);
  }, [setDndOverride]);

  const toggleDnd = useCallback(() => {
    setDndState((prev) => {
      const currentlyActive =
        prev.override === 'on' || (prev.override === null && dndScheduleActive);
      return {
        ...prev,
        override: currentlyActive ? 'off' : 'on',
      };
    });
  }, [dndScheduleActive]);

  const updateDndSchedule = useCallback(
    (id: string, updates: Partial<Omit<DndSchedule, 'id'>>) => {
      setDndState((prev) => ({
        ...prev,
        schedules: prev.schedules.map((schedule) => {
          if (schedule.id !== id) return schedule;
          return {
            ...schedule,
            ...updates,
            days:
              updates.days !== undefined
                ? [...updates.days]
                : [...schedule.days],
          };
        }),
      }));
    },
    []
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
        dndActive,
        dndScheduleActive,
        dndOverride: dndSettings.override,
        dndSchedules: dndSettings.schedules,
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
        toggleDnd,
        setDndOverride,
        clearDndOverride,
        updateDndSchedule,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

