"use client";

import { ChangeEvent, useEffect, useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings } from '../../../hooks/useSettings';
import {
  THEME_UNLOCKS,
  getUnlockedThemes,
  isThemeUnlocked,
} from '../../../utils/theme';

/** Simple Adwaita-like toggle switch */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-ubt-blue' : 'bg-ubt-grey'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : ''
        }`}
      ></span>
    </button>
  );
}

export default function ThemeSettings() {
  const { theme, setTheme } = useSettings();
  const [panelSize, setPanelSize] = usePersistentState('app:panel-icons', 16);
  const [gridSize, setGridSize] = usePersistentState('app:grid-icons', 64);
  const [highScore] = usePersistentState<number>(
    'game-highscore',
    0,
    (value): value is number => typeof value === 'number',
  );

  const unlockedThemes = useMemo(
    () => new Set(getUnlockedThemes(highScore)),
    [highScore],
  );

  useEffect(() => {
    if (!isThemeUnlocked(theme, highScore)) {
      setTheme('default');
    }
  }, [theme, highScore, setTheme]);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (!isThemeUnlocked(next, highScore)) {
      return;
    }
    setTheme(next);
  };

  return (
    <div className="flex h-full">
      <nav className="w-48 p-4 border-r border-ubt-cool-grey text-sm">
        <ul className="space-y-1.5">
          <li>
            <a
              className="flex items-center gap-2 p-2 rounded-l-md border-l-2 border-ubt-blue bg-ub-cool-grey"
            >
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <span>Theme</span>
            </a>
          </li>
          <li>
            <a
              href="/ui/settings/display"
              className="flex items-center gap-2 p-2 rounded-l-md hover:bg-ub-cool-grey"
            >
              <span className="w-6 h-6 bg-ubt-grey rounded"></span>
              <span>Display</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-xl mb-4">Theme</h1>
        <select
          value={theme}
          onChange={handleChange}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {Object.entries(THEME_UNLOCKS).map(([value, requiredScore]) => {
            const unlocked = unlockedThemes.has(value);
            return (
              <option key={value} value={value} disabled={!unlocked}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
                {!unlocked ? ` (unlock at ${requiredScore})` : ''}
              </option>
            );
          })}
        </select>
        <p className="mt-2 text-xs text-ubt-grey/80">
          High score: {highScore}. Themes unlock automatically as you reach the
          required score in any arcade game.
        </p>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Panel Icons</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            <Toggle
              checked={panelSize === 32}
              label="Toggle large panel icons"
              onChange={(val) => setPanelSize(val ? 32 : 16)}
            />
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
          </div>
          <div className="flex gap-2 p-2 bg-ub-cool-grey rounded">
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
            <div
              className="bg-ubt-grey rounded"
              style={{ width: panelSize, height: panelSize }}
            ></div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg mb-2">Grid Icons</h2>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
            <Toggle
              checked={gridSize === 96}
              label="Toggle large grid icons"
              onChange={(val) => setGridSize(val ? 96 : 64)}
            />
            <span className="w-6 h-6 bg-ubt-grey rounded"></span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 bg-ub-cool-grey rounded">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-ubt-grey rounded"
                style={{ width: gridSize, height: gridSize }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

