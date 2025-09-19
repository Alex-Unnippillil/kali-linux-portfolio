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
  getDesktopGrid as loadDesktopGrid,
  setDesktopGrid as saveDesktopGrid,
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

export type DesktopGridPreset = 'spacious' | 'comfortable' | 'cozy' | 'compact';
export type DesktopGridMode = DesktopGridPreset | 'custom';

export interface DesktopGridSetting {
  preset: DesktopGridMode;
  spacing: number;
}

export interface DesktopGridMetrics {
  spacing: number;
  iconWidth: number;
  iconHeight: number;
  cellWidth: number;
  cellHeight: number;
  vars: Record<string, string>;
}

export const DESKTOP_GRID_PRESETS: Array<{
  id: DesktopGridPreset;
  label: string;
  spacing: number;
}> = [
  { id: 'spacious', label: 'Spacious', spacing: 48 },
  { id: 'comfortable', label: 'Comfortable', spacing: 36 },
  { id: 'cozy', label: 'Cozy', spacing: 28 },
  { id: 'compact', label: 'Compact', spacing: 20 },
];

export const DESKTOP_GRID_RANGE = {
  min: 16,
  max: 96,
  step: 4,
};

export const DESKTOP_ICON_DIMENSIONS = {
  width: 96,
  height: 96,
};

const isDesktopPreset = (value: string): value is DesktopGridPreset =>
  DESKTOP_GRID_PRESETS.some((preset) => preset.id === value);

const clampSpacing = (value: number) => {
  const numeric = Number.isFinite(value) ? value : DESKTOP_GRID_RANGE.min;
  return Math.min(DESKTOP_GRID_RANGE.max, Math.max(DESKTOP_GRID_RANGE.min, numeric));
};

export const computeDesktopGridMetrics = (grid: DesktopGridSetting): DesktopGridMetrics => {
  const spacing = clampSpacing(grid.spacing);
  const iconWidth = DESKTOP_ICON_DIMENSIONS.width;
  const iconHeight = DESKTOP_ICON_DIMENSIONS.height;
  const cellWidth = iconWidth + spacing;
  const cellHeight = iconHeight + spacing;
  return {
    spacing,
    iconWidth,
    iconHeight,
    cellWidth,
    cellHeight,
    vars: {
      '--desktop-grid-spacing': `${spacing}px`,
      '--desktop-grid-cell-width': `${cellWidth}px`,
      '--desktop-grid-cell-height': `${cellHeight}px`,
      '--desktop-icon-width': `${iconWidth}px`,
      '--desktop-icon-height': `${iconHeight}px`,
    },
  };
};

export const desktopGridToCssVars = (grid: DesktopGridSetting) =>
  computeDesktopGridMetrics(grid).vars;

const normalizeDesktopGrid = (value?: Partial<DesktopGridSetting> | null): DesktopGridSetting => {
  const fallback = defaults.desktopGrid ?? { preset: 'comfortable', spacing: 32 };
  const presetValue =
    value && typeof value.preset === 'string' && (value.preset === 'custom' || isDesktopPreset(value.preset))
      ? (value.preset as DesktopGridMode)
      : (fallback.preset as DesktopGridMode);
  const spacingValue =
    value && typeof value.spacing === 'number'
      ? value.spacing
      : value && typeof value.spacing === 'string'
        ? parseFloat(value.spacing)
        : fallback.spacing;
  return { preset: presetValue, spacing: clampSpacing(spacingValue) };
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
  desktopGrid: DesktopGridSetting;
  desktopGridMetrics: DesktopGridMetrics;
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
  setDesktopGrid: (value: DesktopGridSetting) => void;
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
  desktopGrid: normalizeDesktopGrid(defaults.desktopGrid),
  desktopGridMetrics: computeDesktopGridMetrics(normalizeDesktopGrid(defaults.desktopGrid)),
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
  setDesktopGrid: () => {},
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
  const [desktopGrid, setDesktopGridState] = useState<DesktopGridSetting>(() =>
    normalizeDesktopGrid(defaults.desktopGrid),
  );
  const fetchRef = useRef<typeof fetch | null>(null);
  const desktopGridMetrics = useMemo(() => computeDesktopGridMetrics(desktopGrid), [desktopGrid]);

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
      setDesktopGridState(normalizeDesktopGrid(await loadDesktopGrid()));
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
    Object.entries(desktopGridMetrics.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    saveDesktopGrid(desktopGrid);
  }, [desktopGrid, desktopGridMetrics]);

  const updateDesktopGrid = (value: DesktopGridSetting) => {
    setDesktopGridState(normalizeDesktopGrid(value));
  };

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
        desktopGrid,
        desktopGridMetrics,
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
        setDesktopGrid: updateDesktopGrid,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

