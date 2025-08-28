import { useState, useEffect } from 'react';
import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';
import { getFontSize, setFontSize } from '../utils/fontSize';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const [fontSize, setFontSizeState] = useState(getFontSize());
  const unlocked = getUnlockedThemes(highScore);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'high-contrast',
      theme === 'high-contrast'
    );
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--font-size-base',
      `${fontSize}px`
    );
  }, [fontSize]);

  const changeTheme = (t: string) => {
    setThemeState(t);
    setTheme(t);
  };

  const changeFont = (size: number) => {
    setFontSizeState(size);
    setFontSize(size);
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
            Font Size
            <input
              type="range"
              min={12}
              max={24}
              value={fontSize}
              onChange={(e) => changeFont(parseInt(e.target.value))}
              aria-label="font-size-slider"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
