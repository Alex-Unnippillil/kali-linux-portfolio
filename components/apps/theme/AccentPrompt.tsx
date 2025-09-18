import React, { useEffect, useRef } from 'react';
import tinycolor from 'tinycolor2';
import { WallpaperAccentSuggestion } from '../../../hooks/useWallpaper';
import { contrastRatio } from '../../../utils/color/contrast';

interface AccentPromptProps {
  suggestion: WallpaperAccentSuggestion | null;
  onApprove: () => void;
  onDismiss: () => void;
}

const formatWallpaperName = (wallpaper: string): string =>
  wallpaper.replace(/wall-/, 'Wallpaper ');

const AccentPrompt: React.FC<AccentPromptProps> = ({ suggestion, onApprove, onDismiss }) => {
  const approveRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!suggestion) return;
    const id = requestAnimationFrame(() => approveRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [suggestion]);

  useEffect(() => {
    if (!suggestion) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [suggestion, onDismiss]);

  if (!suggestion) return null;

  const { color, wallpaper, contrast, currentAccent } = suggestion;
  const readableText = tinycolor
    .mostReadable(color, ['#000000', '#ffffff'], {
      includeFallbackColors: true,
      level: 'AAA',
      size: 'large',
    })
    .toHexString();

  const contrastPass = contrast >= 4.5;
  const ratioLabel = `${contrast.toFixed(2)}:1`;
  const contrastMessage = contrastPass
    ? 'Passes WCAG AA contrast'
    : 'Needs manual contrast review';

  const relativeToCurrentAccent = contrastRatio(color, currentAccent);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accent-prompt-title"
        aria-describedby="accent-prompt-description"
        className="w-full max-w-md rounded-lg bg-ub-cool-grey p-6 shadow-2xl outline-none ring-1 ring-ubt-cool-grey"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="accent-prompt-title" className="text-lg font-semibold text-ubt-grey">
              Match desktop accent to {formatWallpaperName(wallpaper)}?
            </h2>
            <p id="accent-prompt-description" className="mt-1 text-sm text-ubt-grey">
              We found a highlight color in your new wallpaper. Apply it to buttons and focus rings?
            </p>
          </div>
        </header>

        <div className="mt-5 rounded-lg border border-ubt-cool-grey bg-ub-grey/70 p-4">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="h-12 w-12 rounded-full border border-white/30 shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 text-sm">
              <p className="font-medium text-ubt-grey">Suggested accent</p>
              <p className="font-semibold text-white">{color.toUpperCase()}</p>
              <p className="text-xs text-ubt-grey">
                {ratioLabel} contrast vs desktop background · {contrastMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-dashed border-ubt-cool-grey p-4 text-sm text-ubt-grey">
          <p className="font-medium">Preview</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              backgroundColor: color,
              color: readableText,
              boxShadow: `0 0 0 2px ${color}33`,
            }}
            aria-label="Accent preview"
            disabled
          >
            Accent action
          </button>
          <p className="mt-2 text-xs">
            Relative contrast against current accent: {relativeToCurrentAccent.toFixed(2)}:1
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-ub-grey px-4 py-2 text-sm font-medium text-ubt-grey transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={onDismiss}
          >
            Keep current accent
          </button>
          <button
            type="button"
            ref={approveRef}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: color, color: readableText }}
            onClick={onApprove}
          >
            Use wallpaper accent
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccentPrompt;
