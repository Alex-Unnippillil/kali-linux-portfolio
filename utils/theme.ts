export const THEME_KEY = 'app:theme';

const FALLBACK_THEME = 'kali';

const normalizeTheme = (theme?: string | null): string => {
  if (!theme) return FALLBACK_THEME;
  return theme === 'default' ? FALLBACK_THEME : theme;
};

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  [FALLBACK_THEME]: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(
    normalizeTheme(theme) as (typeof DARK_THEMES)[number]
  );

export const getTheme = (): string => {
  if (typeof window === 'undefined') return FALLBACK_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'default') {
      window.localStorage.setItem(THEME_KEY, FALLBACK_THEME);
      return FALLBACK_THEME;
    }
    if (stored) return normalizeTheme(stored);
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : FALLBACK_THEME;
  } catch {
    return FALLBACK_THEME;
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeTheme(theme);
    window.localStorage.setItem(THEME_KEY, normalized);
    document.documentElement.dataset.theme = normalized;
    document.documentElement.classList.toggle(
      'dark',
      isDarkTheme(normalized)
    );
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): string[] => {
  const themes = Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => normalizeTheme(theme));
  return Array.from(new Set(themes));
};

export const isThemeUnlocked = (theme: string, highScore: number): boolean => {
  const normalized = normalizeTheme(theme);
  return highScore >= (THEME_UNLOCKS[normalized] ?? Infinity);
};
