export const THEME_KEY = 'app:theme';

const resolveAutoTheme = (): string => {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'kali-dark' : 'kali-light';
};

export const isDarkTheme = (theme: string): boolean => theme === 'kali-dark';

export const getTheme = (): string => {
  if (typeof window === 'undefined') return 'auto';
  try {
    return window.localStorage.getItem(THEME_KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    const applied = theme === 'auto' ? resolveAutoTheme() : theme;
    document.documentElement.dataset.theme = applied;
    document.documentElement.classList.toggle('dark', isDarkTheme(applied));
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (_highScore?: number): string[] => [
  'auto',
  'kali-dark',
  'kali-light',
];

export const isThemeUnlocked = (theme: string, _highScore: number): boolean =>
  getUnlockedThemes().includes(theme);
