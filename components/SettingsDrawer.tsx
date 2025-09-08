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
    autoAccent,
    setAutoAccent,
    theme,
    setTheme,
    highContrast,
    setHighContrast,
  } = useSettings();

  return (
    <div>
      <button aria-label="settings" onClick={() => setOpen((o) => !o)}>
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
          <label className="mt-2 flex items-center gap-2">
            <input
              id="settings-high-contrast"
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            <span>High Contrast</span>
          </label>
          <label>
            Accent
            <div
              aria-label="accent-color-picker"
              role="radiogroup"
              className="flex gap-2 mt-1"
            >
              <button
                aria-label="select-accent-auto"
                role="radio"
                aria-checked={autoAccent}
                onClick={() => setAutoAccent(true)}
                className={`w-6 h-6 rounded-full border-2 ${
                  autoAccent ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: accent }}
              />
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={!autoAccent && accent === c}
                  onClick={() => {
                    setAutoAccent(false);
                    setAccent(c);
                  }}
                  className={`w-6 h-6 rounded-full border-2 ${
                    !autoAccent && accent === c
                      ? 'border-white'
                      : 'border-transparent'
                  }`}
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
