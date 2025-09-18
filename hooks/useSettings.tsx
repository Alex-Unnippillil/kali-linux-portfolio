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
  getBodyFont as loadBodyFont,
  setBodyFont as saveBodyFont,
  getCodeFont as loadCodeFont,
  setCodeFont as saveCodeFont,
  getAntialiasing as loadAntialiasing,
  setAntialiasing as saveAntialiasing,
  getHinting as loadHinting,
  setHinting as saveHinting,
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

export const BODY_FONT_OPTIONS = [
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    stack: "'Ubuntu', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sample: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: 'system',
    label: 'System UI',
    stack:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
    sample: 'System fonts follow your device defaults.',
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sample: 'Inter keeps dense dashboards readable.',
  },
] as const;

export const CODE_FONT_OPTIONS = [
  {
    id: 'fira-code',
    label: 'Fira Code',
    stack: "'Fira Code', 'Source Code Pro', 'Ubuntu Mono', 'Courier New', monospace",
    sample: 'const packet = decode(frame);',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SFMono-Regular', monospace",
    sample: 'git commit -m "refine settings";',
  },
  {
    id: 'system-mono',
    label: 'System Mono',
    stack: "'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
    sample: 'printf("hello, kali\n");',
  },
] as const;

export const ANTIALIASING_OPTIONS = [
  {
    id: 'system',
    label: 'System default',
    description: 'Use the browser and OS smoothing.',
  },
  {
    id: 'grayscale',
    label: 'Grayscale',
    description: 'Force grayscale antialiasing for crisper edges.',
  },
] as const;

export const HINTING_OPTIONS = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Browser chooses optimal hinting.',
  },
  {
    id: 'legibility',
    label: 'Legibility',
    description: 'Prioritize smooth curves and readability.',
  },
  {
    id: 'precision',
    label: 'Precision',
    description: 'Favor sharp geometry for UI text.',
  },
] as const;

type BodyFontId = (typeof BODY_FONT_OPTIONS)[number]['id'];
type CodeFontId = (typeof CODE_FONT_OPTIONS)[number]['id'];
type AntialiasingId = (typeof ANTIALIASING_OPTIONS)[number]['id'];
type HintingId = (typeof HINTING_OPTIONS)[number]['id'];

const bodyFontStacks = new Map<BodyFontId, string>(
  BODY_FONT_OPTIONS.map((option) => [option.id, option.stack]),
);

const codeFontStacks = new Map<CodeFontId, string>(
  CODE_FONT_OPTIONS.map((option) => [option.id, option.stack]),
);

const antialiasingPresets: Record<AntialiasingId, { webkit: string; moz: string; standard: string }> = {
  system: { webkit: 'auto', moz: 'auto', standard: 'auto' },
  grayscale: { webkit: 'antialiased', moz: 'grayscale', standard: 'always' },
};

const hintingPresets: Record<HintingId, string> = {
  auto: 'auto',
  legibility: 'optimizeLegibility',
  precision: 'geometricPrecision',
};

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
  bodyFont: BodyFontId;
  codeFont: CodeFontId;
  antialiasing: AntialiasingId;
  hinting: HintingId;
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
  setBodyFont: (value: BodyFontId) => void;
  setCodeFont: (value: CodeFontId) => void;
  setAntialiasing: (value: AntialiasingId) => void;
  setHinting: (value: HintingId) => void;
  setTheme: (value: string) => void;
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
  bodyFont: defaults.bodyFont as BodyFontId,
  codeFont: defaults.codeFont as CodeFontId,
  antialiasing: defaults.antialiasing as AntialiasingId,
  hinting: defaults.hinting as HintingId,
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
  setBodyFont: () => {},
  setCodeFont: () => {},
  setAntialiasing: () => {},
  setHinting: () => {},
  setTheme: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const resolveBodyFont = (): BodyFontId => {
    if (typeof window === 'undefined') return defaults.bodyFont as BodyFontId;
    const stored = window.localStorage.getItem('font-body');
    return stored && bodyFontStacks.has(stored as BodyFontId)
      ? (stored as BodyFontId)
      : (defaults.bodyFont as BodyFontId);
  };

  const resolveCodeFont = (): CodeFontId => {
    if (typeof window === 'undefined') return defaults.codeFont as CodeFontId;
    const stored = window.localStorage.getItem('font-code');
    return stored && codeFontStacks.has(stored as CodeFontId)
      ? (stored as CodeFontId)
      : (defaults.codeFont as CodeFontId);
  };

  const resolveAntialiasing = (): AntialiasingId => {
    if (typeof window === 'undefined') return defaults.antialiasing as AntialiasingId;
    const stored = window.localStorage.getItem('font-antialiasing');
    return stored && Object.prototype.hasOwnProperty.call(antialiasingPresets, stored)
      ? (stored as AntialiasingId)
      : (defaults.antialiasing as AntialiasingId);
  };

  const resolveHinting = (): HintingId => {
    if (typeof window === 'undefined') return defaults.hinting as HintingId;
    const stored = window.localStorage.getItem('font-hinting');
    return stored && Object.prototype.hasOwnProperty.call(hintingPresets, stored)
      ? (stored as HintingId)
      : (defaults.hinting as HintingId);
  };

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
  const [bodyFont, setBodyFont] = useState<BodyFontId>(() => resolveBodyFont());
  const [codeFont, setCodeFont] = useState<CodeFontId>(() => resolveCodeFont());
  const [antialiasing, setAntialiasing] = useState<AntialiasingId>(() => resolveAntialiasing());
  const [hinting, setHinting] = useState<HintingId>(() => resolveHinting());
  const [theme, setTheme] = useState<string>(() => loadTheme());
  const fetchRef = useRef<typeof fetch | null>(null);

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
      const storedBodyFont = await loadBodyFont();
      if (bodyFontStacks.has(storedBodyFont as BodyFontId)) {
        setBodyFont(storedBodyFont as BodyFontId);
      } else {
        setBodyFont(defaults.bodyFont as BodyFontId);
      }
      const storedCodeFont = await loadCodeFont();
      if (codeFontStacks.has(storedCodeFont as CodeFontId)) {
        setCodeFont(storedCodeFont as CodeFontId);
      } else {
        setCodeFont(defaults.codeFont as CodeFontId);
      }
      const storedAntialiasing = await loadAntialiasing();
      if (Object.prototype.hasOwnProperty.call(antialiasingPresets, storedAntialiasing)) {
        setAntialiasing(storedAntialiasing as AntialiasingId);
      } else {
        setAntialiasing(defaults.antialiasing as AntialiasingId);
      }
      const storedHinting = await loadHinting();
      if (Object.prototype.hasOwnProperty.call(hintingPresets, storedHinting)) {
        setHinting(storedHinting as HintingId);
      } else {
        setHinting(defaults.hinting as HintingId);
      }
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
    const stack =
      bodyFontStacks.get(bodyFont) ?? bodyFontStacks.get(defaults.bodyFont as BodyFontId);
    if (stack) {
      document.documentElement.style.setProperty('--font-family-body', stack);
      document.documentElement.style.setProperty('--font-family-base', stack);
      document.body.style.fontFamily = stack;
    }
    document.documentElement.dataset.bodyFont = bodyFont;
    saveBodyFont(bodyFont);
  }, [bodyFont]);

  useEffect(() => {
    const stack =
      codeFontStacks.get(codeFont) ?? codeFontStacks.get(defaults.codeFont as CodeFontId);
    if (stack) {
      document.documentElement.style.setProperty('--font-family-code', stack);
    }
    document.documentElement.dataset.codeFont = codeFont;
    saveCodeFont(codeFont);
  }, [codeFont]);

  useEffect(() => {
    const preset =
      antialiasingPresets[antialiasing] ||
      antialiasingPresets[defaults.antialiasing as AntialiasingId];
    document.documentElement.style.setProperty('--font-smoothing-webkit', preset.webkit);
    document.documentElement.style.setProperty('--font-smoothing-moz', preset.moz);
    document.documentElement.style.setProperty('--font-smoothing-standard', preset.standard);
    document.documentElement.dataset.fontAntialiasing = antialiasing;
    saveAntialiasing(antialiasing);
  }, [antialiasing]);

  useEffect(() => {
    const preset = hintingPresets[hinting] || hintingPresets[defaults.hinting as HintingId];
    document.documentElement.style.setProperty('--font-text-rendering', preset);
    document.documentElement.dataset.fontHinting = hinting;
    saveHinting(hinting);
  }, [hinting]);

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
        bodyFont,
        codeFont,
        antialiasing,
        hinting,
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
        setBodyFont,
        setCodeFont,
        setAntialiasing,
        setHinting,
        setTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

