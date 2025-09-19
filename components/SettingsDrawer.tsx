import { useId, useRef, useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import Overlay from './ui/Overlay';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div>
      <button
        ref={triggerRef}
        aria-label="settings"
        onClick={() => setOpen(true)}
        className="rounded bg-gray-700 px-3 py-1 text-sm font-medium text-white hover:bg-gray-600"
      >
        Settings
      </button>
      <Overlay
        open={open}
        onOpenChange={setOpen}
        labelledBy={titleId}
        describedBy={descriptionId}
        variant="drawer-right"
        className="flex h-full w-full max-w-xs flex-col gap-4 bg-gray-900 p-4 text-white shadow-2xl"
        returnFocusRef={triggerRef}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            Settings
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
          >
            Close
          </button>
        </div>
        <p id={descriptionId} className="text-sm text-gray-200">
          Choose a theme and accent for your desktop.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-100">Theme</span>
          <select
            aria-label="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
          >
            {unlocked.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-gray-100">Accent</span>
          <div
            aria-label="accent-color-picker"
            role="radiogroup"
            className="flex flex-wrap gap-2"
          >
            {ACCENT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`select-accent-${c}`}
                role="radio"
                aria-checked={accent === c}
                onClick={() => setAccent(c)}
                className={`h-6 w-6 rounded-full border-2 ${accent === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </Overlay>
    </div>
  );
};

export default SettingsDrawer;
