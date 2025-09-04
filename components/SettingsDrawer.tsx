import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings } from '../hooks/useSettings';
import Modal from './base/Modal';

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
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="p-4 bg-ub-cool-grey rounded-md shadow">
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
        </div>
      </Modal>
    </div>
  );
};

export default SettingsDrawer;
