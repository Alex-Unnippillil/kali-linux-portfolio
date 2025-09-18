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
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
import { safeLocalStorage } from '../utils/safeStorage';
import { logEvent } from '../utils/analytics';
type Density = 'regular' | 'compact';

type StylusPoint = { x: number; y: number };
type StylusCurveState = {
  controlPoints: [StylusPoint, StylusPoint];
  presetId: string;
};
type StylusPreset = {
  id: string;
  name: string;
  description: string;
  controlPoints: [StylusPoint, StylusPoint];
};

export type StylusAction = 'none' | 'undo' | 'erase' | 'pan' | 'eyedropper';
type StylusButton = 'primary' | 'secondary' | 'eraser';
export type StylusButtonMapping = Record<StylusButton, StylusAction>;

type StylusMetrics = {
  totalSamples: number;
  averagePressure: number;
  lastPressure: number;
  lastUpdated: number | null;
  lastFocusedApp: string | null;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const clampPoint = (point: StylusPoint): StylusPoint => ({
  x: clamp(point.x),
  y: clamp(point.y),
});

const cloneCurvePoints = (
  points: [StylusPoint, StylusPoint]
): [StylusPoint, StylusPoint] =>
  points.map((p) => clampPoint(p)) as [StylusPoint, StylusPoint];

const cloneMapping = (mapping: StylusButtonMapping): StylusButtonMapping => ({
  primary: mapping.primary,
  secondary: mapping.secondary,
  eraser: mapping.eraser,
});

const STYLUS_CURVE_KEY = 'stylus-curve';
const STYLUS_MAPPING_KEY = 'stylus-button-mappings';
export const STYLUS_GLOBAL_MAPPING_ID = '__global__';

const STYLUS_ACTIONS: StylusAction[] = [
  'none',
  'undo',
  'erase',
  'pan',
  'eyedropper',
];

const DEFAULT_BUTTON_MAPPING: StylusButtonMapping = {
  primary: 'undo',
  secondary: 'eyedropper',
  eraser: 'erase',
};

const PRESET_DEFS: Array<Omit<StylusPreset, 'controlPoints'> & {
  controlPoints: StylusPoint[];
}> = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Linear pressure response for everyday sketching.',
    controlPoints: [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.75 },
    ],
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Requires firmer press near the start for calligraphy strokes.',
    controlPoints: [
      { x: 0.3, y: 0.1 },
      { x: 0.9, y: 0.6 },
    ],
  },
  {
    id: 'firm',
    name: 'Firm',
    description: 'Fast ramp to full pressure for shading or bold lines.',
    controlPoints: [
      { x: 0.1, y: 0.5 },
      { x: 0.7, y: 0.95 },
    ],
  },
];

const STYLUS_PRESETS: StylusPreset[] = PRESET_DEFS.map((preset) => ({
  ...preset,
  controlPoints: cloneCurvePoints(
    [preset.controlPoints[0], preset.controlPoints[1]] as [StylusPoint, StylusPoint]
  ),
}));

const DEFAULT_CURVE: StylusCurveState = {
  controlPoints: cloneCurvePoints(STYLUS_PRESETS[0].controlPoints),
  presetId: STYLUS_PRESETS[0].id,
};

const evaluateBezier = (
  t: number,
  p0: StylusPoint,
  p1: StylusPoint,
  p2: StylusPoint,
  p3: StylusPoint
): StylusPoint => {
  const clampedT = clamp(t);
  const oneMinusT = 1 - clampedT;
  const x =
    oneMinusT ** 3 * p0.x +
    3 * oneMinusT ** 2 * clampedT * p1.x +
    3 * oneMinusT * clampedT ** 2 * p2.x +
    clampedT ** 3 * p3.x;
  const y =
    oneMinusT ** 3 * p0.y +
    3 * oneMinusT ** 2 * clampedT * p1.y +
    3 * oneMinusT * clampedT ** 2 * p2.y +
    clampedT ** 3 * p3.y;
  return { x, y };
};

const isValidPoint = (value: unknown): value is StylusPoint =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'x' in (value as Record<string, unknown>) &&
      'y' in (value as Record<string, unknown>) &&
      typeof (value as StylusPoint).x === 'number' &&
      typeof (value as StylusPoint).y === 'number'
  );

const isStylusAction = (value: unknown): value is StylusAction =>
  STYLUS_ACTIONS.includes(value as StylusAction);

const normalizeMapping = (mapping: unknown): StylusButtonMapping | null => {
  if (!mapping || typeof mapping !== 'object') return null;
  const candidate = mapping as Partial<StylusButtonMapping>;
  if (
    isStylusAction(candidate.primary) &&
    isStylusAction(candidate.secondary) &&
    isStylusAction(candidate.eraser)
  ) {
    return {
      primary: candidate.primary,
      secondary: candidate.secondary,
      eraser: candidate.eraser,
    };
  }
  return null;
};

const readStylusCurve = (): StylusCurveState => {
  if (typeof window === 'undefined' || !safeLocalStorage) {
    return {
      controlPoints: cloneCurvePoints(DEFAULT_CURVE.controlPoints),
      presetId: DEFAULT_CURVE.presetId,
    };
  }
  try {
    const raw = safeLocalStorage.getItem(STYLUS_CURVE_KEY);
    if (!raw) {
      return {
        controlPoints: cloneCurvePoints(DEFAULT_CURVE.controlPoints),
        presetId: DEFAULT_CURVE.presetId,
      };
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.controlPoints) &&
      parsed.controlPoints.length === 2 &&
      isValidPoint(parsed.controlPoints[0]) &&
      isValidPoint(parsed.controlPoints[1])
    ) {
      return {
        controlPoints: cloneCurvePoints([
          parsed.controlPoints[0] as StylusPoint,
          parsed.controlPoints[1] as StylusPoint,
        ]),
        presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'custom',
      };
    }
  } catch (error) {
    console.warn('Failed to parse stored stylus curve', error);
  }
  return {
    controlPoints: cloneCurvePoints(DEFAULT_CURVE.controlPoints),
    presetId: DEFAULT_CURVE.presetId,
  };
};

const readStylusMappings = (): Record<string, StylusButtonMapping> => {
  const base: Record<string, StylusButtonMapping> = {
    [STYLUS_GLOBAL_MAPPING_ID]: cloneMapping(DEFAULT_BUTTON_MAPPING),
  };
  if (typeof window === 'undefined' || !safeLocalStorage) {
    return base;
  }
  try {
    const raw = safeLocalStorage.getItem(STYLUS_MAPPING_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return base;
    const next: Record<string, StylusButtonMapping> = { ...base };
    Object.entries(parsed as Record<string, unknown>).forEach(([appId, value]) => {
      const normalized = normalizeMapping(value);
      if (normalized) {
        next[appId] = normalized;
      }
    });
    if (!next[STYLUS_GLOBAL_MAPPING_ID]) {
      next[STYLUS_GLOBAL_MAPPING_ID] = cloneMapping(DEFAULT_BUTTON_MAPPING);
    }
    return next;
  } catch (error) {
    console.warn('Failed to parse stored stylus mappings', error);
    return base;
  }
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
  stylusCurve: StylusCurveState;
  stylusCurvePresetId: string;
  stylusPresets: StylusPreset[];
  updateStylusCurvePoint: (index: 0 | 1, point: StylusPoint) => void;
  applyStylusPreset: (presetId: string) => void;
  resetStylusCurve: () => void;
  mapStylusPressure: (pressure: number) => number;
  stylusActions: StylusAction[];
  stylusButtonMappings: Record<string, StylusButtonMapping>;
  getStylusMapping: (appId?: string | null) => StylusButtonMapping;
  updateStylusButtonMapping: (
    appId: string,
    updates: Partial<StylusButtonMapping>
  ) => void;
  resetStylusButtonMapping: (appId?: string) => void;
  stylusActiveAppId: string | null;
  activeStylusMapping: StylusButtonMapping;
  stylusMetrics: StylusMetrics;
  recordStylusSample: (pressure: number) => void;
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
  stylusCurve: DEFAULT_CURVE,
  stylusCurvePresetId: DEFAULT_CURVE.presetId,
  stylusPresets: STYLUS_PRESETS,
  updateStylusCurvePoint: () => {},
  applyStylusPreset: () => {},
  resetStylusCurve: () => {},
  mapStylusPressure: (value: number) => value,
  stylusActions: STYLUS_ACTIONS,
  stylusButtonMappings: {
    [STYLUS_GLOBAL_MAPPING_ID]: cloneMapping(DEFAULT_BUTTON_MAPPING),
  },
  getStylusMapping: () => cloneMapping(DEFAULT_BUTTON_MAPPING),
  updateStylusButtonMapping: () => {},
  resetStylusButtonMapping: () => {},
  stylusActiveAppId: null,
  activeStylusMapping: cloneMapping(DEFAULT_BUTTON_MAPPING),
  stylusMetrics: {
    totalSamples: 0,
    averagePressure: 0,
    lastPressure: 0,
    lastUpdated: null,
    lastFocusedApp: null,
  },
  recordStylusSample: () => {},
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
  const fetchRef = useRef<typeof fetch | null>(null);
  const [stylusCurve, setStylusCurve] = useState<StylusCurveState>(() => readStylusCurve());
  const [stylusButtonMappings, setStylusButtonMappings] = useState<Record<string, StylusButtonMapping>>(
    () => readStylusMappings()
  );
  const [stylusActiveAppId, setStylusActiveAppId] = useState<string | null>(null);
  const [activeStylusMapping, setActiveStylusMapping] = useState<StylusButtonMapping>(
    cloneMapping(DEFAULT_BUTTON_MAPPING)
  );
  const [stylusMetrics, setStylusMetrics] = useState<StylusMetrics>({
    totalSamples: 0,
    averagePressure: 0,
    lastPressure: 0,
    lastUpdated: null,
    lastFocusedApp: null,
  });
  const loggedPressureRef = useRef(false);

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
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(
        STYLUS_CURVE_KEY,
        JSON.stringify({
          controlPoints: stylusCurve.controlPoints,
          presetId: stylusCurve.presetId,
        })
      );
    } catch (error) {
      console.warn('Failed to persist stylus curve', error);
    }
  }, [stylusCurve]);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(
        STYLUS_MAPPING_KEY,
        JSON.stringify(stylusButtonMappings)
      );
    } catch (error) {
      console.warn('Failed to persist stylus mappings', error);
    }
  }, [stylusButtonMappings]);

  const resolveMapping = useCallback(
    (appId?: string | null): StylusButtonMapping => {
      const globalMapping =
        stylusButtonMappings[STYLUS_GLOBAL_MAPPING_ID] || DEFAULT_BUTTON_MAPPING;
      const base = cloneMapping(globalMapping);
      if (!appId) {
        return base;
      }
      const specific = stylusButtonMappings[appId];
      if (!specific) {
        return base;
      }
      return {
        primary: specific.primary ?? base.primary,
        secondary: specific.secondary ?? base.secondary,
        eraser: specific.eraser ?? base.eraser,
      };
    },
    [stylusButtonMappings]
  );

  useEffect(() => {
    setActiveStylusMapping(resolveMapping(stylusActiveAppId));
  }, [resolveMapping, stylusActiveAppId, stylusButtonMappings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = (event: Event) => {
      const { detail } = event as CustomEvent<{ appId?: string }>;
      const appId = detail?.appId ?? null;
      setStylusActiveAppId(appId);
      setStylusMetrics((prev) => ({
        ...prev,
        lastFocusedApp: appId,
      }));
      logEvent({
        category: 'Stylus Settings',
        action: 'Window Focus Changed',
        label: appId ?? STYLUS_GLOBAL_MAPPING_ID,
      });
    };
    window.addEventListener('kali:window-focus', handleFocus as EventListener);
    return () =>
      window.removeEventListener('kali:window-focus', handleFocus as EventListener);
  }, []);

  const updateStylusCurvePoint = useCallback((index: 0 | 1, point: StylusPoint) => {
    setStylusCurve((prev) => {
      const nextPoints = cloneCurvePoints(prev.controlPoints);
      nextPoints[index] = clampPoint(point);
      return {
        controlPoints: nextPoints,
        presetId: 'custom',
      };
    });
  }, []);

  const applyStylusPreset = useCallback((presetId: string) => {
    const preset = STYLUS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setStylusCurve({
      controlPoints: cloneCurvePoints(preset.controlPoints),
      presetId: preset.id,
    });
    logEvent({
      category: 'Stylus Settings',
      action: 'Apply Preset',
      label: presetId,
    });
  }, []);

  const resetStylusCurve = useCallback(() => {
    setStylusCurve({
      controlPoints: cloneCurvePoints(DEFAULT_CURVE.controlPoints),
      presetId: DEFAULT_CURVE.presetId,
    });
    logEvent({
      category: 'Stylus Settings',
      action: 'Reset Curve',
    });
  }, []);

  const mapStylusPressure = useCallback(
    (pressure: number) => {
      const [c1, c2] = stylusCurve.controlPoints;
      const mapped = evaluateBezier(pressure, { x: 0, y: 0 }, c1, c2, {
        x: 1,
        y: 1,
      });
      return clamp(mapped.y);
    },
    [stylusCurve]
  );

  const updateStylusButtonMapping = useCallback(
    (appId: string, updates: Partial<StylusButtonMapping>) => {
      setStylusButtonMappings((prev) => {
        const current = prev[appId] || cloneMapping(DEFAULT_BUTTON_MAPPING);
        const next = {
          ...current,
          ...updates,
        } as StylusButtonMapping;
        logEvent({
          category: 'Stylus Settings',
          action: 'Update Button Mapping',
          label: appId,
        });
        return {
          ...prev,
          [appId]: next,
        };
      });
    },
    []
  );

  const resetStylusButtonMapping = useCallback((appId?: string) => {
    setStylusButtonMappings((prev) => {
      if (!appId || appId === STYLUS_GLOBAL_MAPPING_ID) {
        logEvent({
          category: 'Stylus Settings',
          action: 'Reset Button Mapping',
          label: STYLUS_GLOBAL_MAPPING_ID,
        });
        return {
          [STYLUS_GLOBAL_MAPPING_ID]: cloneMapping(DEFAULT_BUTTON_MAPPING),
        };
      }
      const next = { ...prev };
      delete next[appId];
      logEvent({
        category: 'Stylus Settings',
        action: 'Reset Button Mapping',
        label: appId,
      });
      if (!next[STYLUS_GLOBAL_MAPPING_ID]) {
        next[STYLUS_GLOBAL_MAPPING_ID] = cloneMapping(DEFAULT_BUTTON_MAPPING);
      }
      return next;
    });
  }, []);

  const getStylusMapping = useCallback(
    (appId?: string | null) => resolveMapping(appId),
    [resolveMapping]
  );

  const recordStylusSample = useCallback(
    (pressure: number) => {
      const clamped = clamp(pressure);
      setStylusMetrics((prev) => {
        const totalSamples = prev.totalSamples + 1;
        const averagePressure =
          prev.averagePressure + (clamped - prev.averagePressure) / totalSamples;
        return {
          ...prev,
          totalSamples,
          averagePressure,
          lastPressure: clamped,
          lastUpdated: Date.now(),
        };
      });
      if (!loggedPressureRef.current) {
        logEvent({
          category: 'Stylus Settings',
          action: 'Pressure Test Started',
        });
        loggedPressureRef.current = true;
      }
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
        stylusCurve,
        stylusCurvePresetId: stylusCurve.presetId,
        stylusPresets: STYLUS_PRESETS,
        updateStylusCurvePoint,
        applyStylusPreset,
        resetStylusCurve,
        mapStylusPressure,
        stylusActions: STYLUS_ACTIONS,
        stylusButtonMappings,
        getStylusMapping,
        updateStylusButtonMapping,
        resetStylusButtonMapping,
        stylusActiveAppId,
        activeStylusMapping,
        stylusMetrics,
        recordStylusSample,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

