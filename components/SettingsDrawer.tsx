import { useMemo, useState } from 'react';
import { THEME_UNLOCKS, isThemeUnlocked } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

type ThemeEntry = {
  id: string;
  label: string;
  requiredScore: number;
};

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const { accent, setAccent, theme, setTheme } = useSettings();

  const { unlockedThemes, lockedThemes } = useMemo(() => {
    const sortedThemes = Object.entries(THEME_UNLOCKS).sort(
      ([nameA, scoreA], [nameB, scoreB]) =>
        scoreA - scoreB || nameA.localeCompare(nameB)
    );

    const partitioned = sortedThemes.reduce(
      (acc, [themeName, requiredScore]) => {
        const unlocked = isThemeUnlocked(themeName, highScore);
        const entry = {
          id: themeName,
          label: themeName.charAt(0).toUpperCase() + themeName.slice(1),
          requiredScore,
        };

        if (unlocked) {
          acc.unlocked.push(entry);
        } else {
          acc.locked.push(entry);
        }

        return acc;
      },
      { unlocked: [] as ThemeEntry[], locked: [] as ThemeEntry[] }
    );

    return {
      unlockedThemes: partitioned.unlocked,
      lockedThemes: partitioned.locked,
    };
  }, [highScore]);

  const handleThemeSelect = (value: string) => {
    if (theme === value) return;
    const available = unlockedThemes.some((entry) => entry.id === value);
    if (!available) return;
    setTheme(value);
  };

  return (
    <div>
      <button aria-label="settings" onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (
        <div role="dialog">
          <label>
            Theme
            <div
              role="radiogroup"
              aria-label="unlocked-themes"
              className="flex flex-wrap gap-2 mt-1"
            >
              {unlockedThemes.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={theme === id}
                  aria-label={`${label} theme`}
                  className={`px-3 py-2 rounded border transition-colors ${
                    theme === id
                      ? 'bg-white/10 border-white/40'
                      : 'bg-black/10 border-white/10 hover:border-white/30'
                  }`}
                  title={`Switch to the ${label} theme`}
                  onClick={() => handleThemeSelect(id)}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  {theme === id && (
                    <span className="sr-only">(selected)</span>
                  )}
                </button>
              ))}
            </div>
          </label>
          {lockedThemes.length > 0 && (
            <div className="mt-4" aria-label="locked-themes">
              <p className="text-sm font-semibold">Locked themes</p>
              <p className="text-xs text-white/70">
                Beat the required high score to unlock additional looks.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lockedThemes.map(({ id, label, requiredScore }) => {
                  const message = `Reach ${requiredScore} points to unlock the ${label} theme. Current high score: ${highScore}.`;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${label} theme locked. Reach ${requiredScore} points to unlock.`}
                      className="px-3 py-2 rounded border border-dashed border-white/20 bg-black/30 text-left flex flex-col gap-1 opacity-60 cursor-not-allowed"
                      title={message}
                      aria-disabled="true"
                      disabled
                      data-locked="true"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span aria-hidden="true">🔒</span>
                        <span>{label}</span>
                      </span>
                      <span className="text-xs text-white/80">
                        Reach {requiredScore} points to unlock. Current high score:{' '}
                        {highScore}.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
