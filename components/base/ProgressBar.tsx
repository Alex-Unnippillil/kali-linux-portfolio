import React from 'react';

export interface ProgressStep {
  current: number;
  total: number;
  label?: string;
}

export interface ProgressMetadata {
  step?: ProgressStep;
  detail?: string;
  /**
   * Estimated seconds remaining. Use null when an estimate cannot be produced,
   * or omit entirely to hide the ETA row.
   */
  etaSeconds?: number | null;
}

export interface ProgressBarProps {
  progress: number;
  label?: string;
  metadata?: ProgressMetadata;
  className?: string;
  ariaLabel?: string;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const now = () =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now());

export const formatEta = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0s';
  }
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${Math.max(1, secs)}s`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  metadata,
  className = '',
  ariaLabel,
}) => {
  const clamped = clampPercent(progress);
  const percentText = `${Math.round(clamped)}%`;

  const stepText = metadata?.step
    ? `Step ${metadata.step.current} of ${metadata.step.total}${
        metadata.step.label ? ` – ${metadata.step.label}` : ''
      }`
    : undefined;

  let etaText: string | undefined;
  if (metadata) {
    if (metadata.etaSeconds === null) {
      etaText = 'ETA pending';
    } else if (typeof metadata.etaSeconds === 'number') {
      etaText = `ETA ${formatEta(metadata.etaSeconds)}`;
    }
  }

  const ariaValueText = [label, stepText, metadata?.detail, etaText, percentText]
    .filter(Boolean)
    .join('. ');

  return (
    <div className={`space-y-1 text-xs text-white ${className}`}>
      {label && <div className="text-sm font-semibold text-white">{label}</div>}
      {stepText && <div className="text-[11px] text-gray-200">{stepText}</div>}
      {metadata?.detail && (
        <div className="text-[11px] text-gray-300" aria-live="polite">
          {metadata.detail}
        </div>
      )}
      <div
        className="relative h-2 w-full overflow-hidden rounded bg-white/20"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={ariaValueText || undefined}
      >
        <div
          className="absolute left-0 top-0 h-full rounded bg-blue-500 transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-200">
        <span>{etaText}</span>
        <span>{percentText}</span>
      </div>
    </div>
  );
};

export default ProgressBar;

export const computeEtaSeconds = (
  bytesProcessed: number,
  totalBytes: number,
  startedAt: number,
): number | null => {
  if (totalBytes <= 0 || bytesProcessed <= 0) return null;
  const elapsedMs = now() - startedAt;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return null;
  const rate = bytesProcessed / (elapsedMs / 1000);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const remainingBytes = totalBytes - bytesProcessed;
  if (remainingBytes <= 0) return 0;
  return remainingBytes / rate;
};

