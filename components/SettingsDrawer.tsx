import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import { getQuickSettings, setQuickSettings } from '../utils/quickSettingsStore';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const unlocked = useMemo(() => getUnlockedThemes(highScore), [highScore]);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const hasInteractedRef = useRef(false);
  const overflowRef = useRef<string>();

  useFocusTrap(dialogRef, open);

  const persistTheme = useCallback(
    (value: string) => {
      setQuickSettings({ theme: value });
    },
    [],
  );

  const persistAccent = useCallback(
    (value: string) => {
      setQuickSettings({ accent: value });
    },
    [],
  );

  const handleOpen = () => {
    hasInteractedRef.current = true;
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const applyStoredValues = useCallback(() => {
    const stored = getQuickSettings();
    const storedTheme = unlocked.includes(stored.theme) ? stored.theme : unlocked[0] ?? 'default';
    const storedAccent = ACCENT_OPTIONS.includes(stored.accent)
      ? stored.accent
      : ACCENT_OPTIONS[0];

    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
    if (storedAccent && storedAccent !== accent) {
      setAccent(storedAccent);
    }
  }, [accent, setAccent, setTheme, theme, unlocked]);

  useEffect(() => {
    if (!open) return;
    applyStoredValues();
  }, [open, applyStoredValues]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    overflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowRef.current ?? '';
    };
  }, [open]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!open && hasInteractedRef.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!ACCENT_OPTIONS.includes(accent)) return;
    persistAccent(accent);
  }, [accent, persistAccent]);

  useEffect(() => {
    if (!unlocked.includes(theme)) return;
    persistTheme(theme);
  }, [persistTheme, theme, unlocked]);

  const handleThemeChange = useCallback(
    (nextTheme: string) => {
      if (!unlocked.includes(nextTheme)) return;
      if (theme !== nextTheme) {
        setTheme(nextTheme);
      }
      persistTheme(nextTheme);
    },
    [persistTheme, setTheme, theme, unlocked],
  );

  const handleAccentChange = useCallback(
    (nextAccent: string) => {
      if (!ACCENT_OPTIONS.includes(nextAccent)) return;
      if (accent !== nextAccent) {
        setAccent(nextAccent);
      }
      persistAccent(nextAccent);
    },
    [accent, persistAccent, setAccent],
  );

  return (
    <div>
      <button
        ref={triggerRef}
        aria-label="settings"
        type="button"
        onClick={open ? handleClose : handleOpen}
      >
        Settings
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            role="presentation"
            onClick={handleClose}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-drawer-title"
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-ub-cool-grey text-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 id="settings-drawer-title" className="text-lg font-semibold">
                Settings
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded px-2 py-1 text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
            <div className="flex h-[calc(100%-3.5rem)] flex-col gap-4 overflow-y-auto px-4 py-6">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  Theme
                </span>
                <select
                  aria-label="theme-select"
                  className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                >
                  {unlocked.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-white/70">
                  Accent
                </span>
                <div
                  aria-label="accent-color-picker"
                  role="radiogroup"
                  className="flex flex-wrap gap-3"
                >
                  {ACCENT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`select-accent-${c}`}
                      role="radio"
                      aria-checked={accent === c}
                      onClick={() => handleAccentChange(c)}
                      className={`h-8 w-8 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue ${
                        accent === c ? 'border-white shadow-inner shadow-white/40' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
