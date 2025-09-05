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
    showVolumeOSD,
    setShowVolumeOSD,
    showBrightnessOSD,
    setShowBrightnessOSD,
  } = useSettings();

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
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              aria-label="toggle-volume-osd"
              checked={showVolumeOSD}
              onChange={(e) => setShowVolumeOSD(e.target.checked)}
            />
            <span>Show volume OSD</span>
          </label>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              aria-label="toggle-brightness-osd"
              checked={showBrightnessOSD}
              onChange={(e) => setShowBrightnessOSD(e.target.checked)}
            />
            <span>Show brightness OSD</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
