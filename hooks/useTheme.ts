import { useEffect, useState } from 'react';
import { THEME_KEY, getTheme, getThemeStorageKey, setTheme as applyTheme } from '../utils/theme';
import { useProfiles } from './useProfiles';

export const useTheme = () => {
  const { activeProfileId } = useProfiles();
  const [theme, setThemeState] = useState<string>(() => getTheme(activeProfileId));

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const key = getThemeStorageKey(activeProfileId);
      if (e.key === key || (!activeProfileId && e.key === THEME_KEY)) {
        const next = getTheme(activeProfileId);
        setThemeState(next);
        applyTheme(next, activeProfileId);

      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [activeProfileId]);

  useEffect(() => {
    const next = getTheme(activeProfileId);
    setThemeState(next);
    applyTheme(next, activeProfileId);
  }, [activeProfileId]);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next, activeProfileId);

  };

  return { theme, setTheme };
};

