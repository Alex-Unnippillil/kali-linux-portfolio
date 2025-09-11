"use client";

import { useEffect, useState } from 'react';
import { getTheme, setTheme, isDarkTheme } from '../../utils/theme';

/**
 * Toggle between light and dark themes.
 * Applies theme by updating the <html> element's dataset and class list.
 * Respects system preference on first load and persists choice in localStorage.
 */
const ThemeToggle = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const handleToggle = () => {
    setThemeState(isDarkTheme(theme) ? 'default' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="underline"
      aria-label="Toggle theme"
    >
      {isDarkTheme(theme) ? 'Light mode' : 'Dark mode'}
    </button>
  );
};

export default ThemeToggle;
