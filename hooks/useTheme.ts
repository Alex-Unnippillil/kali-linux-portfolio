import { useEffect, useState } from 'react';
import {
  THEME_KEY,
  getTheme,
  setTheme as applyTheme,
  type ThemeName,
} from '../utils/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeName>(() => getTheme());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = getTheme();
        setThemeState(next);
        applyTheme(next);

      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    applyTheme(next);

  };

  return { theme, setTheme };
};

