import { useState } from 'react';
import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';
import { useSettings } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent } = useSettings();

  const changeTheme = (t: string) => {
    setThemeState(t);
    setTheme(t);
  };

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
              onChange={(e) => changeTheme(e.target.value)}
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
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
