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
  getPanelPosition as loadPanelPosition,
  setPanelPosition as savePanelPosition,
  getPanelSize as loadPanelSize,
  setPanelSize as savePanelSize,
  getPanelOpacity as loadPanelOpacity,
  setPanelOpacity as savePanelOpacity,
  getPanelAutohide as loadPanelAutohide,
  setPanelAutohide as savePanelAutohide,
  getWorkspaceCount as loadWorkspaceCount,
  setWorkspaceCount as saveWorkspaceCount,
  getWorkspaceNames as loadWorkspaceNames,
  setWorkspaceNames as saveWorkspaceNames,
  defaults,
} from '../utils/settingsStore';
import { getTheme as loadTheme, setTheme as saveTheme } from '../utils/theme';
type Density = 'regular' | 'compact';
type PanelPosition = 'top' | 'bottom';

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
  panelPosition: PanelPosition;
  panelSize: number;
  panelOpacity: number;
  panelAutohide: boolean;
  workspaceCount: number;
  workspaceNames: string[];
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
  setPanelPosition: (value: PanelPosition) => void;
  setPanelSize: (value: number) => void;
  setPanelOpacity: (value: number) => void;
  setPanelAutohide: (value: boolean) => void;
  setWorkspaceCount: (value: number) => void;
  setWorkspaceNames: (value: string[]) => void;
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
  panelPosition: (defaults.panelPosition || 'bottom') as PanelPosition,
  panelSize: defaults.panelSize ?? 40,
  panelOpacity: defaults.panelOpacity ?? 0.5,
  panelAutohide: defaults.panelAutohide ?? false,
  workspaceCount: defaults.workspaceCount ?? 4,
  workspaceNames: defaults.workspaceNames ?? ['Desktop 1', 'Desktop 2', 'Desktop 3', 'Desktop 4'],
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
  setPanelPosition: () => {},
  setPanelSize: () => {},
  setPanelOpacity: () => {},
  setPanelAutohide: () => {},
  setWorkspaceCount: () => {},
  setWorkspaceNames: () => {},
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
  const [panelPosition, setPanelPositionState] = useState<PanelPosition>(
    ((defaults.panelPosition as PanelPosition) || 'bottom') as PanelPosition,
  );
  const [panelSize, setPanelSizeState] = useState<number>(defaults.panelSize ?? 40);
  const [panelOpacity, setPanelOpacityState] = useState<number>(
    defaults.panelOpacity ?? 0.5,
  );
  const [panelAutohide, setPanelAutohideState] = useState<boolean>(
    defaults.panelAutohide ?? false,
  );
  const [workspaceCount, setWorkspaceCountState] = useState<number>(
    defaults.workspaceCount ?? 4,
  );
  const [workspaceNames, setWorkspaceNamesState] = useState<string[]>(
    defaults.workspaceNames ?? ['Desktop 1', 'Desktop 2', 'Desktop 3', 'Desktop 4'],
  );
  const fetchRef = useRef<typeof fetch | null>(null);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const updatePanelPosition = (value: PanelPosition) => {
    setPanelPositionState(value);
  };

  const updatePanelSize = (value: number) => {
    const normalized = Math.round(clamp(value, 32, 128));
    setPanelSizeState(normalized);
  };

  const updatePanelOpacity = (value: number) => {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue : panelOpacity;
    setPanelOpacityState(clamp(safeValue, 0.1, 1));
  };

  const updatePanelAutohide = (value: boolean) => {
    setPanelAutohideState(value);
  };

  const updateWorkspaceCount = (value: number) => {
    const normalized = Math.round(clamp(value, 1, 8));
    setWorkspaceCountState(normalized);
  };

  const updateWorkspaceNames = (value: string[]) => {
    setWorkspaceNamesState((prev) => {
      const target = Math.max(workspaceCount, value.length);
      const trimmed = value
        .slice(0, target)
        .map((name, idx) => name.trim() || `Desktop ${idx + 1}`);
      if (trimmed.length === target) return trimmed;
      const additions = Array.from({ length: target - trimmed.length }, (_, idx) => {
        const index = trimmed.length + idx;
        return (
          defaults.workspaceNames?.[index] ?? `Desktop ${index + 1}`
        );
      });
      return [...trimmed, ...additions];
    });
  };

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
      setPanelPositionState((await loadPanelPosition()) as PanelPosition);
      setPanelSizeState(await loadPanelSize());
      setPanelOpacityState(await loadPanelOpacity());
      setPanelAutohideState(await loadPanelAutohide());
      const loadedWorkspaceCount = await loadWorkspaceCount();
      setWorkspaceCountState(loadedWorkspaceCount);
      setWorkspaceNamesState(await loadWorkspaceNames());
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
    document.documentElement.dataset.panelPosition = panelPosition;
    savePanelPosition(panelPosition);
  }, [panelPosition]);

  useEffect(() => {
    const sizePx = `${panelSize}px`;
    document.documentElement.style.setProperty('--panel-size', sizePx);
    savePanelSize(panelSize);
  }, [panelSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--panel-opacity',
      panelOpacity.toString(),
    );
    savePanelOpacity(panelOpacity);
  }, [panelOpacity]);

  useEffect(() => {
    document.documentElement.classList.toggle('panel-autohide', panelAutohide);
    savePanelAutohide(panelAutohide);
  }, [panelAutohide]);

  useEffect(() => {
    setWorkspaceNamesState((prev) => {
      if (prev.length >= workspaceCount) return prev.slice(0, workspaceCount);
      const additions = Array.from(
        { length: workspaceCount - prev.length },
        (_, idx) => {
          const index = prev.length + idx;
          return (
            defaults.workspaceNames?.[index] ?? `Desktop ${index + 1}`
          );
        },
      );
      return [...prev, ...additions];
    });
    document.documentElement.setAttribute(
      'data-workspace-count',
      workspaceCount.toString(),
    );
    saveWorkspaceCount(workspaceCount);
  }, [workspaceCount]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-workspace-names',
      workspaceNames.slice(0, workspaceCount).join('|'),
    );
    saveWorkspaceNames(workspaceNames);
  }, [workspaceNames, workspaceCount]);

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
        panelPosition,
        panelSize,
        panelOpacity,
        panelAutohide,
        workspaceCount,
        workspaceNames,
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
        setPanelPosition: updatePanelPosition,
        setPanelSize: updatePanelSize,
        setPanelOpacity: updatePanelOpacity,
        setPanelAutohide: updatePanelAutohide,
        setWorkspaceCount: updateWorkspaceCount,
        setWorkspaceNames: updateWorkspaceNames,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

