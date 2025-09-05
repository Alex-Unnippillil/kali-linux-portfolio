import { useEffect, useState } from 'react';

const ICON_THEME_KEY = 'app:icon-theme';
const DEFAULT_ICON_THEME = 'Yaru';

export const useIconTheme = () => {
  const [iconTheme, setIconThemeState] = useState<string>(DEFAULT_ICON_THEME);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ICON_THEME_KEY);
      if (stored) {
        setIconThemeState(stored);
        document.documentElement.dataset.iconTheme = stored;
      } else {
        document.documentElement.dataset.iconTheme = DEFAULT_ICON_THEME;
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ICON_THEME_KEY, iconTheme);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.iconTheme = iconTheme;
  }, [iconTheme]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ICON_THEME_KEY) {
        const next = e.newValue || DEFAULT_ICON_THEME;
        setIconThemeState(next);
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.iconTheme = next;
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setIconTheme = (next: string) => {
    setIconThemeState(next);
  };

  return { iconTheme, setIconTheme };
};

