import { useEffect, useState } from 'react';
import { THEME_KEY, getTheme, setTheme as applyTheme } from '../utils/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = getTheme();
        setThemeState(next);
        applyTheme(next);
      }
    };
    window.addEventListener('storage', handleStorage);
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleMedia = () => {
      if (getTheme() === 'auto') applyTheme('auto');
    };
    media?.addEventListener('change', handleMedia);
    return () => {
      window.removeEventListener('storage', handleStorage);
      media?.removeEventListener('change', handleMedia);
    };
  }, []);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
};

