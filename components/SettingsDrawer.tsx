import { useEffect, useState, useRef } from 'react';
import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';
import useFocusTrap from '../hooks/useFocusTrap';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState('default');
  const unlocked = getUnlockedThemes(highScore);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  const changeTheme = (t: string) => {
    setThemeState(t);
    setTheme(t);
  };

  return (
    <div>
      <button
        aria-label="Open settings"
        onClick={() => setOpen(!open)}
        className="focus-visible:outline focus-visible:ring"
      >
        Settings
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          ref={dialogRef}
          className="p-2 bg-white"
        >
          <label>
            Theme
            <select
              aria-label="Select theme"
              value={theme}
              onChange={(e) => changeTheme(e.target.value)}
              className="focus-visible:outline focus-visible:ring"
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
