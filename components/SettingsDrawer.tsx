import { useRef, useState } from 'react';
import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';
import useFocusTrap from '../hooks/useFocusTrap';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const unlocked = getUnlockedThemes(highScore);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open);

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
        <div ref={dialogRef} role="dialog" aria-modal="true">
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
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
