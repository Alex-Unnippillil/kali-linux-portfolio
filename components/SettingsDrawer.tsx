import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();

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
          <label>
            Accent
            <div
              aria-label="accent-color-picker"
              role="radiogroup"
              className="flex gap-2 mt-1"
            >
              {ACCENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  aria-label={`select-accent-${option.id}`}
                  role="radio"
                  aria-checked={accent === option.value}
                  onClick={() => setAccent(option.value)}
                  className={`w-6 h-6 rounded-full border-2 ${accent === option.value ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: option.value }}
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
