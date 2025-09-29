import { useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();

  const panelId = 'settings-panel';
  const themeSectionId = 'settings-theme-section';
  const accentSectionId = 'settings-accent-section';

  return (
    <div className="space-y-3">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label="settings"
        className="px-3 py-1 text-sm font-semibold rounded bg-gray-800 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setOpen(!open)}
        type="button"
      >
        Settings
      </button>
      {open && (
        <section
          aria-labelledby="settings-drawer-heading"
          className="space-y-6 rounded-lg bg-gray-900/90 p-4 text-sm text-gray-100 shadow-lg"
          id={panelId}
          role="dialog"
        >
          <h2 className="text-lg font-semibold text-white" id="settings-drawer-heading">
            Settings
          </h2>

          <section aria-labelledby="theme-heading" className="space-y-2" id={themeSectionId}>
            <h3 className="text-base font-semibold text-white" id="theme-heading">
              Theme
            </h3>
            <label className="flex flex-col gap-1 text-gray-200" htmlFor="theme-select">
              <span className="text-xs uppercase tracking-wide text-gray-400">Select theme</span>
              <select
                aria-describedby={`${themeSectionId}-description`}
                className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                id="theme-select"
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
            <p className="text-xs text-gray-400" id={`${themeSectionId}-description`}>
              Choose from unlocked interface themes.
            </p>
          </section>

          <section aria-labelledby="accent-heading" className="space-y-2" id={accentSectionId}>
            <h3 className="text-base font-semibold text-white" id="accent-heading">
              Accent
            </h3>
            <fieldset
              aria-describedby={`${accentSectionId}-description`}
              className="space-y-3"
              role="radiogroup"
            >
              <legend className="sr-only">Accent color</legend>
              <div className="flex flex-wrap gap-2">
                {ACCENT_OPTIONS.map((c) => (
                  <label className="relative" key={c}>
                    <span className="sr-only">{`Accent ${c}`}</span>
                    <input
                      aria-checked={accent === c}
                      aria-label={`select-accent-${c}`}
                      checked={accent === c}
                      className="peer sr-only"
                      name="accent"
                      onChange={() => setAccent(c)}
                      type="radio"
                      value={c}
                    />
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-transparent transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-400"
                      style={{ backgroundColor: c }}
                    >
                      {accent === c && (
                        <span className="h-3 w-3 rounded-full border-2 border-white" />
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-gray-400" id={`${accentSectionId}-description`}>
              Pick a highlight color for system chrome.
            </p>
          </section>
        </section>
      )}
    </div>
  );
};

export default SettingsDrawer;
