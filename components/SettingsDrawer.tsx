"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import useFocusTrap from '../hooks/useFocusTrap';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const idBase = useId();
  const drawerId = `${idBase}-settings-drawer`;
  const headingId = `${idBase}-settings-heading`;

  useFocusTrap({
    active: open,
    containerRef: drawerRef,
    initialFocusRef: selectRef,
    onEscape: () => setOpen(false),
    returnFocusRef: triggerRef,
  });

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (drawerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, triggerRef]);

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-label="settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen((prev) => !prev)}
      >
        Settings
      </button>
      {open && (
        <div
          id={drawerId}
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className="mt-2 rounded-md border border-white/10 bg-ub-cool-grey p-4 shadow-lg"
        >
          <h2 id={headingId} className="sr-only">
            Settings
          </h2>
          <label className="flex flex-col gap-2">
            <span>Theme</span>
            <select
              ref={selectRef}
              aria-label="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded bg-black/40 px-2 py-1"
            >
              {unlocked.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 flex flex-col gap-2">
            <span>Accent</span>
            <div
              aria-label="accent-color-picker"
              role="radiogroup"
              className="flex gap-2"
            >
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={accent === c}
                  onClick={() => setAccent(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubb-orange ${
                    accent === c ? 'border-white shadow' : 'border-transparent'
                  }`}
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
