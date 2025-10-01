import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const {
    accent,
    setAccent,
    theme,
    setTheme,
    highContrast,
    setHighContrast,
    highContrastMode,
    setHighContrastMode,
  } = useSettings();
  const followingSystem = highContrastMode === 'system';

  return (
    <div>
      <button aria-label="settings" onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (
        <div role="dialog">
          <label>
            Theme
            <select
              aria-label="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {unlocked.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
            <div className="mt-4">
              <label htmlFor="drawer-high-contrast" className="mr-2">
                High contrast
              </label>
              <input
                id="drawer-high-contrast"
                type="checkbox"
                className="ml-2 align-middle"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                aria-label="High contrast"
                aria-describedby="drawer-high-contrast-help"
              />
            </div>
          <p id="drawer-high-contrast-help" className="mt-2 text-xs text-ubt-grey">
            {followingSystem
              ? 'Matches your operating system preference. Toggle to override if you need extra contrast.'
              : 'Manual override enabled. Turn it off or follow system settings when you no longer need the override.'}
          </p>
          {!followingSystem && (
            <button
              type="button"
              className="mt-2 text-xs underline"
              onClick={() => setHighContrastMode('system')}
            >
              Follow system preference
            </button>
          )}
          <label>
            Accent
            <div
              aria-label="accent-color-picker"
              role="radiogroup"
              className="flex gap-2 mt-1"
            >
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={accent === c}
                  onClick={() => setAccent(c)}
                  className={`w-6 h-6 rounded-full border-2 ${accent === c ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
