import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme, lowSpec, setLowSpec } = useSettings();

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
            <input
              aria-label="accent-color-picker"
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={lowSpec}
              onChange={(e) => setLowSpec(e.target.checked)}
            />
            Low-spec mode
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
