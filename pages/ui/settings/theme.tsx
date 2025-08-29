import { useState, useEffect, ChangeEvent } from 'react';
import { getTheme, setTheme } from '../../../utils/theme';

export default function ThemeSettings() {
  const [theme, setThemeState] = useState('default');

  useEffect(() => {
    const current = getTheme();
    setTheme(current);
    setThemeState(current);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setThemeState(next);
    setTheme(next);
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

