import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import AccentPicker from './AccentPicker';

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
          <label className="block">
            <span className="block text-sm font-medium">Accent</span>
            <AccentPicker
              value={accent}
              options={ACCENT_OPTIONS}
              onChange={setAccent}
              className="mt-2 grid-cols-3"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
