export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  light: 0,
  ubuntu: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix', 'ubuntu'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);

const buildWallpaperUrl = (name?: string | null): string | null => {
  if (!name) return null;
  if (name === 'kali-gradient') return null;
  if (/^data:image\//.test(name) || /^https?:\/\//.test(name) || name.startsWith('/')) return name;
  return `/wallpapers/${name}.webp`;
};

export interface DesktopTheme {
  id: string;
  accent: string;
  wallpaperUrl: string | null;
  fallbackWallpaperUrl: string | null;
  wallpaperName: string | null;
  overlay?: string;
  useKaliWallpaper: boolean;
}

type DesktopThemePreset = {
  accent?: string;
  wallpaperName?: string;
  overlay?: string;
  useKaliWallpaper?: boolean;
};

export const DESKTOP_THEME_PRESETS: Record<string, DesktopThemePreset> = {
  light: {
    accent: '#3b82f6',
    wallpaperName: 'wall-4',
    overlay: 'linear-gradient(165deg, rgba(255,255,255,0.65) 0%, rgba(238,242,255,0.4) 45%, rgba(255,255,255,0.2) 100%)',
    useKaliWallpaper: false,
  },
  dark: {
    accent: '#64b5f6',
    wallpaperName: 'wall-7',
    overlay: 'linear-gradient(160deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.52) 70%)',
    useKaliWallpaper: false,
  },
  ubuntu: {
    accent: '#f97316',
    wallpaperName: 'wall-3',
    overlay: 'linear-gradient(160deg, rgba(20,6,16,0.78) 0%, rgba(18,8,10,0.55) 55%, rgba(0,0,0,0.72) 100%)',
    useKaliWallpaper: false,
  },
  neon: {
    accent: '#00f6ff',
    wallpaperName: 'wall-5',
    overlay:
      'linear-gradient(125deg, rgba(0, 12, 24, 0.85) 0%, rgba(0, 6, 12, 0.45) 45%, rgba(0, 0, 0, 0.78) 100%)',
    useKaliWallpaper: false,
  },
  matrix: {
    accent: '#00ff9c',
    wallpaperName: 'wall-8',
    overlay: 'linear-gradient(140deg, rgba(0, 36, 16, 0.82) 0%, rgba(0, 0, 0, 0.85) 85%)',
    useKaliWallpaper: false,
  },
};

interface ResolveDesktopThemeInput {
  theme: string;
  accent: string;
  wallpaperName: string;
  bgImageName: string;
  useKaliWallpaper: boolean;
}

export const resolveDesktopTheme = ({
  theme,
  accent,
  wallpaperName,
  bgImageName,
  useKaliWallpaper,
}: ResolveDesktopThemeInput): DesktopTheme => {
  const preset = DESKTOP_THEME_PRESETS[theme] ?? {};
  const resolvedUseKali = preset.useKaliWallpaper ?? useKaliWallpaper;
  const fallbackWallpaperUrl = buildWallpaperUrl(wallpaperName);
  const resolvedWallpaperUrl = resolvedUseKali
    ? null
    : buildWallpaperUrl(bgImageName) ?? fallbackWallpaperUrl;

  return {
    id: theme,
    accent,
    wallpaperUrl: resolvedWallpaperUrl,
    fallbackWallpaperUrl: fallbackWallpaperUrl ?? resolvedWallpaperUrl,
    wallpaperName: wallpaperName ?? null,
    overlay: preset.overlay,
    useKaliWallpaper: resolvedUseKali,
  };
};
