"use client";

import { useEffect, ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState.js';
import { getTheme, setTheme } from '../../../utils/theme';

export default function ThemeSettings() {
  // Persist theme selection in localStorage so it survives reloads
  const [theme, setThemeState] = usePersistentState('app:theme', 'default');

  // Initialize and sync theme with user preference or system settings
  useEffect(() => {
    const current = getTheme();
    setThemeState(current);
    setTheme(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme whenever selection changes
  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setThemeState(e.target.value);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Theme</h1>
      <select
        value={theme}
        onChange={handleChange}
        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
      >
        <option value="default">Default</option>
        <option value="dark">Dark</option>
        <option value="neon">Neon</option>
        <option value="matrix">Matrix</option>
      </select>
    </div>
  );
}

