import { useEffect, useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const [opacity, setOpacity] = useState(1);
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    document.documentElement.style.setProperty('--wp-opacity', String(opacity));
  }, [opacity]);

  useEffect(() => {
    document.documentElement.style.setProperty('--wp-blur', `${blur}px`);
  }, [blur]);

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
          <label>
            Wallpaper Opacity
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              aria-label="wallpaper-opacity"
            />
          </label>
          <label>
            Wallpaper Blur
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={blur}
              onChange={(e) => setBlur(parseFloat(e.target.value))}
              aria-label="wallpaper-blur"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
