import { useId, useRef, useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap(dialogRef, open, {
    initialFocusRef: closeButtonRef,
    restoreFocusRef: triggerRef,
  });

  const close = () => setOpen(false);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <div>
      <button
        aria-label="settings"
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
      >
        Settings
      </button>
      {open && (
        <div
          className="relative mt-3 max-w-xs rounded-lg border border-white/10 bg-black/80 p-4 text-sm text-white shadow-xl backdrop-blur"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                Settings
              </h2>
              <p id={descriptionId} className="mt-1 text-[11px] text-gray-300">
                Customize unlocked looks and controls.
              </p>
            </div>
            <button
              type="button"
              ref={closeButtonRef}
              onClick={close}
              aria-label="Close settings"
              className="rounded border border-white/20 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-200 transition hover:border-white/40 hover:text-white"
            >
              Close
            </button>
          </div>
          <label className="mt-4 block">
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
          <label className="mt-4 block">
            Accent
            <div aria-label="accent-color-picker" role="radiogroup" className="mt-1 flex gap-2">
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
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
