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
    volume,
    setVolume,
    reducedMotion,
    setReducedMotion,
    density,
    setDensity,
    highContrast,
    setHighContrast,
  } = useSettings();

  return (
    <div className="relative">
      <button
        aria-label="settings"
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-kali-border/60 bg-kali-surface-muted px-3 py-2 text-sm text-kali-text/80 transition-colors hover:border-kali-focus/60"
      >
        Settings
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-kali-border/60 bg-kali-surface-raised p-4 text-sm text-kali-text shadow-lg"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-kali-text/60">Theme</span>
              <select
                aria-label="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded-md border border-kali-border/60 bg-kali-surface-muted px-2 py-1 text-sm text-kali-text/80"
              >
                {unlocked.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs uppercase tracking-wide text-kali-text/60">Accent</span>
              <div
                aria-label="accent-color-picker"
                role="radiogroup"
                className="mt-2 flex gap-2"
              >
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    aria-label={`select-accent-${c}`}
                    role="radio"
                    aria-checked={accent === c}
                    onClick={() => setAccent(c)}
                    className={`h-6 w-6 rounded-full border-2 ${
                      accent === c ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-kali-text/60">Density</span>
              <select
                aria-label="density-select"
                value={density}
                onChange={(event) => setDensity(event.target.value)}
                className="rounded-md border border-kali-border/60 bg-kali-surface-muted px-2 py-1 text-sm text-kali-text/80"
              >
                <option value="regular">Regular</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            <label className="flex flex-col gap-2" htmlFor="drawer-volume">
              <span className="text-xs uppercase tracking-wide text-kali-text/60">Volume ({volume}%)</span>
              <input
                id="drawer-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={volume}
                onChange={(event) => setVolume(parseInt(event.target.value, 10))}
                className="kali-slider"
                aria-label="Adjust volume"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-kali-text/70">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => setReducedMotion(event.target.checked)}
                className="h-4 w-4 rounded border-kali-border/60"
                aria-label="Enable reduced motion"
              />
              Reduced motion
            </label>
            <label className="flex items-center gap-2 text-xs text-kali-text/70">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(event) => setHighContrast(event.target.checked)}
                className="h-4 w-4 rounded border-kali-border/60"
                aria-label="Enable high contrast mode"
              />
              High contrast
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
