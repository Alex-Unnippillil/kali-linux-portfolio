import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import ToggleSwitch from './ToggleSwitch';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme, tourCompleted, setTourCompleted } = useSettings();

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
          <div className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-white">Replay tour</span>
              <ToggleSwitch
                ariaLabel="Replay desktop tour"
                checked={!tourCompleted}
                onChange={(checked) => setTourCompleted(!checked)}
              />
            </div>
            <p className="mt-1 text-xs text-ubt-grey" aria-live="polite">
              Toggle on to restart the onboarding tour and highlight key desktop controls.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
