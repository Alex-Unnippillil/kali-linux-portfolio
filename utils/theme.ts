export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  'high-contrast': 0,
  dark: 500,
  neon: 100,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix', 'high-contrast'] as const;
const ALWAYS_AVAILABLE_THEMES = ['default', 'high-contrast', 'system'] as const;

const resolveThemePreference = (theme: string): string => {
  if (theme === 'system') {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia
    ) {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      return prefersDark ? 'dark' : 'default';
    }
    return 'default';
  }
  return theme;
};

export const isDarkTheme = (theme: string): boolean => {
  const resolved = resolveThemePreference(theme);
  return DARK_THEMES.includes(resolved as (typeof DARK_THEMES)[number]);
};

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
    const resolved = resolveThemePreference(theme);
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored !== theme) {
      window.localStorage.setItem(THEME_KEY, theme);
    }
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(resolved));
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): string[] => {
  const unlocked: string[] = [];
  const addUnique = (theme: string) => {
    if (!unlocked.includes(theme)) unlocked.push(theme);
  };

  ALWAYS_AVAILABLE_THEMES.forEach(addUnique);

  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .forEach(([theme]) => addUnique(theme));

  return unlocked;
};

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  ALWAYS_AVAILABLE_THEMES.includes(theme as (typeof ALWAYS_AVAILABLE_THEMES)[number]) ||
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
