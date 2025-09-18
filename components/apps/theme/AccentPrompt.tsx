import { FC } from 'react';
import { WallpaperStatus } from '../../../hooks/useWallpaper';

interface AccentPromptProps {
  open: boolean;
  wallpaper: string;
  accent: string;
  currentAccent: string;
  palette: string[];
  status: WallpaperStatus;
  onAccept: () => void;
  onDismiss: () => void;
  error?: string | null;
}

const statusMessage = (status: WallpaperStatus, error?: string | null) => {
  if (status === 'loading') return 'Analyzing wallpaper…';
  if (status === 'error') return error ?? 'Unable to analyze wallpaper';
  return null;
};

const AccentPrompt: FC<AccentPromptProps> = ({
  open,
  wallpaper,
  accent,
  currentAccent,
  palette,
  status,
  onAccept,
  onDismiss,
  error,
}) => {
  if (!open) return null;

  const swatches = palette.filter(Boolean).slice(0, 4);
  const message = statusMessage(status, error);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Wallpaper accent suggestion"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-ubt-cool-grey bg-[var(--color-surface)] text-[var(--color-text)] shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-4 p-4">
        <div className="h-12 w-12 overflow-hidden rounded"
          style={{ backgroundColor: 'var(--color-muted)' }}
        >
          <img
            src={`/wallpapers/${wallpaper}.webp`}
            alt="Wallpaper preview"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Apply wallpaper accent?</p>
          <p className="mt-1 text-xs text-ubt-grey">
            We found a highlight color in your wallpaper. Update focus rings and buttons to use it?
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Swatch color={currentAccent} label="Current" />
            <Swatch color={accent} label="Suggested" highlight />
            {swatches.length > 0 && (
              <div className="flex items-center gap-1" aria-hidden="true">
                {swatches.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-full border border-ubt-cool-grey"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded bg-accent px-3 py-1 text-sm font-medium text-[var(--color-accent-contrast)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Apply accent
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded px-3 py-1 text-sm text-ubt-grey transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Not now
            </button>
            {message && (
              <span
                className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-ubt-grey'}`}
                role={status === 'error' ? 'alert' : undefined}
              >
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Swatch: FC<{ color: string; label: string; highlight?: boolean }> = ({
  color,
  label,
  highlight = false,
}) => (
  <div className="flex items-center gap-2">
    <span
      className={`h-6 w-6 rounded-full border border-ubt-cool-grey ${highlight ? 'ring-2 ring-accent' : ''}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    <span className="text-xs text-ubt-grey">{label}</span>
  </div>
);

export default AccentPrompt;
