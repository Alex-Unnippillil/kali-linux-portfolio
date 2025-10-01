import { useId, useState } from 'react';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS, TYPE_SCALE_RANGE } from '../hooks/useSettings';

interface Props {
  highScore?: number;
}

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme, fontScale, setFontScale } = useSettings();
  const typeScaleId = useId();
  const typeScaleLabelId = useId();
  const typeScaleDescriptionId = useId();

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
            <label id={typeScaleLabelId} htmlFor={typeScaleId} className="block">
              Type scale
            </label>
            <input
              id={typeScaleId}
              type="range"
              min={TYPE_SCALE_RANGE.min}
              max={TYPE_SCALE_RANGE.max}
              step={TYPE_SCALE_RANGE.step}
              value={fontScale}
              onChange={(event) => setFontScale(parseFloat(event.target.value))}
              className="ubuntu-slider mt-2 w-full"
              aria-describedby={typeScaleDescriptionId}
              aria-labelledby={typeScaleLabelId}
              aria-valuetext={`${Math.round(fontScale * 100)} percent`}
            />
            <div
              id={typeScaleDescriptionId}
              className="mt-2 flex w-full justify-between text-xs text-gray-300"
            >
              <span>{Math.round(TYPE_SCALE_RANGE.min * 100)}%</span>
              <span aria-live="polite">
                {Math.round(fontScale * 100)}%
              </span>
              <span>{Math.round(TYPE_SCALE_RANGE.max * 100)}%</span>
            </div>
            <p className="mt-2 text-xs text-gray-400" aria-live="polite" aria-atomic="true">
              Preview text grows and shrinks based on this scale factor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
