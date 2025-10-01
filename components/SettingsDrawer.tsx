import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import { useWelcomeTour } from '../hooks/useWelcomeTour';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const { state: tourState, restartTour, resumeTour } = useWelcomeTour();
  const isTourActive = tourState.status === 'active';
  const canResume = tourState.status === 'skipped';
  const tourStatusDescription = {
    'not-started': 'The welcome tour will launch the next time the desktop loads.',
    active: 'The welcome tour is currently running.',
    skipped: 'The welcome tour is paused. Resume to continue where you left off.',
    completed: 'You completed the welcome tour. Restart anytime for a refresher.',
  }[tourState.status];

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
          <section aria-label="Welcome tour" className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Welcome tour</h3>
            <p className="text-xs text-gray-400" aria-live="polite">
              {tourStatusDescription}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restartTour}
                className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-white shadow focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
              >
                Restart welcome tour
              </button>
              <button
                type="button"
                onClick={resumeTour}
                disabled={!canResume}
                className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
              >
                Resume where I left off
              </button>
            </div>
            {isTourActive && (
              <p className="text-xs text-blue-300" role="status">
                The tour overlay is currently visible.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
