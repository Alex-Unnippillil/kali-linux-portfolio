import { useEffect, useState } from 'react';
import { THEME_KEY, getTheme, setTheme as applyTheme, isDarkTheme } from '../utils/theme';
import { useProfileSwitcher } from './useProfileSwitcher';

export const useTheme = () => {
  const { activeProfileId, isGuest } = useProfileSwitcher();
  const profileId = activeProfileId;
  const persist = !isGuest;
  const [theme, setThemeState] = useState<string>(() => (persist ? getTheme(profileId) : 'default'));

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const key = `${THEME_KEY}:${profileId}`;
      if (e.key === key) {
        const next = getTheme(profileId);
        setThemeState(next);
        applyTheme(profileId, next);

      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [profileId]);

  useEffect(() => {
    if (!persist) {
      setThemeState('default');
      return;
    }
    setThemeState(getTheme(profileId));
  }, [persist, profileId]);

  const setTheme = (next: string) => {
    setThemeState(next);
    if (persist) {
      applyTheme(profileId, next);
    } else {
      document.documentElement.dataset.theme = next;
      document.documentElement.classList.toggle('dark', isDarkTheme(next));
    }

  };

  return { theme, setTheme };
};

