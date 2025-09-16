import { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export const THEME_CLASS_PREFIX = 'theme-';

const BodyThemeClassSync = () => {
  const { theme } = useSettings();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { body } = document;
    if (!body) return;
    const classList = body.classList;
    Array.from(classList)
      .filter((cls) => cls.startsWith(THEME_CLASS_PREFIX))
      .forEach((cls) => classList.remove(cls));
    classList.add(`${THEME_CLASS_PREFIX}${theme}`);
    body.dataset.theme = theme;
  }, [theme]);

  return null;
};

export default BodyThemeClassSync;
