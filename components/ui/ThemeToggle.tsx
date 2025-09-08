'use client';

import { useState } from 'react';
import { getTheme, setTheme, isDarkTheme } from '@/utils/theme';

const ThemeToggle = () => {
  const [theme, setThemeState] = useState(() => getTheme());

  const toggleTheme = () => {
    const nextTheme = isDarkTheme(theme) ? 'default' : 'dark';
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="p-2 border rounded"
    >
      {isDarkTheme(theme) ? 'Light Theme' : 'Dark Theme'}
    </button>
  );
};

export default ThemeToggle;
