'use client';

import { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { THEME_PRESETS } from '../constants/themes';
import { THEME_KEY, getTheme, setTheme } from '../../../utils/theme';

const ThemeLab = () => {
  const [theme, setThemeState] = usePersistentState<string>(
    THEME_KEY,
    getTheme(),
    (v): v is string => typeof v === 'string',
  );
  const [fontScale, setFontScale] = usePersistentState<number>(
    'font-scale',
    1,
    (v): v is number => typeof v === 'number',
  );
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setTheme(theme);
    setAnnouncement(`Theme set to ${theme}`);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--font-multiplier',
      fontScale.toString(),
    );
    setAnnouncement(`Font scale set to ${fontScale.toFixed(2)}`);
  }, [fontScale]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex space-x-2">
        {THEME_PRESETS.map((t) => (
          <button
            key={t.id}
            onClick={() => setThemeState(t.id)}
            className={`px-3 py-1 rounded ${
              theme === t.id
                ? 'bg-ub-orange text-white'
                : 'bg-ub-cool-grey text-ubt-grey'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="theme-lab-font-scale" className="text-ubt-grey">
          Font Scale
        </label>
        <input
          id="theme-lab-font-scale"
          type="range"
          min="0.75"
          max="1.5"
          step="0.05"
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="ubuntu-slider"
        />
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default ThemeLab;
