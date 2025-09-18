import React, { useCallback, useMemo } from 'react';
import {
  RedactionMask,
  createManualMask,
} from '../../../utils/redaction';

interface RedactionReviewProps {
  previewUrl: string;
  masks: RedactionMask[];
  onChange: (next: RedactionMask[]) => void;
  onClose: () => void;
  onSave: () => void;
  isAnalyzing?: boolean;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const RedactionReview: React.FC<RedactionReviewProps> = ({
  previewUrl,
  masks,
  onChange,
  onClose,
  onSave,
  isAnalyzing = false,
}) => {
  const handleRemove = useCallback(
    (id: string) => {
      onChange(masks.filter((mask) => mask.id !== id));
    },
    [masks, onChange],
  );

  const addMaskAtCenter = useCallback(() => {
    const width = 0.3;
    const height = 0.2;
    const mask = createManualMask({
      x: clamp(0.5 - width / 2),
      y: clamp(0.5 - height / 2),
      width,
      height,
    });
    onChange([...masks, mask]);
  }, [masks, onChange]);

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        addMaskAtCenter();
        return;
      }
      const relX = clamp((event.clientX - rect.left) / rect.width);
      const relY = clamp((event.clientY - rect.top) / rect.height);
      const width = 0.25;
      const height = 0.15;
      const mask = createManualMask({
        x: clamp(relX - width / 2),
        y: clamp(relY - height / 2),
        width,
        height,
      });
      onChange([...masks, mask]);
    },
    [addMaskAtCenter, masks, onChange],
  );

  const overlayMasks = useMemo(
    () => masks.filter((mask) => mask.bounds),
    [masks],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      role="dialog"
      aria-modal="true"
      aria-label="Redaction review dialog"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-ub-dark p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Redaction Review</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-ub-cool-grey px-3 py-1 text-xs hover:bg-ub-cool-grey/80"
          >
            Close
          </button>
        </div>
        <div
          className="relative mb-4 overflow-hidden rounded border border-white/20"
          onClick={handlePreviewClick}
          data-testid="redaction-preview"
        >
          <video src={previewUrl} controls className="block w-full" />
          <div className="pointer-events-none absolute inset-0">
            {overlayMasks.map((mask) => (
              <div
                key={mask.id}
                data-testid="redaction-mask"
                className="absolute border-2 border-red-500 bg-red-500/40"
                style={{
                  left: `${clamp(mask.bounds!.x) * 100}%`,
                  top: `${clamp(mask.bounds!.y) * 100}%`,
                  width: `${clamp(mask.bounds!.width) * 100}%`,
                  height: `${clamp(mask.bounds!.height) * 100}%`,
                }}
              >
                <span className="pointer-events-none absolute left-0 top-0 bg-red-600 px-1 text-[10px] uppercase">
                  {mask.type}
                </span>
              </div>
            ))}
          </div>
        </div>
        {isAnalyzing && (
          <p className="mb-2 text-xs text-ub-yellow" data-testid="redaction-status">
            Running automatic redaction detection…
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2" aria-label="redaction mask list">
            {masks.length === 0 && (
              <span className="text-xs text-gray-300">No masks currently applied.</span>
            )}
            {masks.map((mask) => (
              <div
                key={mask.id}
                data-testid="redaction-chip"
                className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs"
              >
                <span className="uppercase text-ub-yellow">{mask.type}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(mask.id)}
                  className="rounded bg-red-600 px-2 py-0.5 text-[10px] hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addMaskAtCenter}
              className="rounded bg-ub-cool-grey px-3 py-1 text-xs hover:bg-ub-cool-grey/80"
            >
              Add Mask
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded bg-ub-dracula px-4 py-1 text-xs font-semibold hover:bg-ub-dracula-dark"
            >
              Save Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedactionReview;
