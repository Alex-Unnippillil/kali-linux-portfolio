import React from 'react';

interface ProgressBarProps {
  progress?: number;
  className?: string;
  wrapperClassName?: string;
  min?: number;
  max?: number;
  showValue?: boolean;
  variant?: 'determinate' | 'indeterminate';
}

export default function ProgressBar({
  progress = 0,
  className = '',
  wrapperClassName = '',
  min = 0,
  max = 100,
  showValue = true,
  variant = 'determinate',
}: ProgressBarProps) {
  const isDeterminate = variant === 'determinate';
  const rangeMin = Math.min(min, max);
  const rangeMax = Math.max(min, max);
  const isZeroRange = rangeMax === rangeMin;
  const safeRange = isZeroRange ? 1 : rangeMax - rangeMin;
  const rawProgress = progress ?? rangeMin;
  const clamped = Math.min(Math.max(rawProgress, rangeMin), rangeMax);
  const percentComplete = isZeroRange
    ? 100
    : ((clamped - rangeMin) / safeRange) * 100;
  const ariaProps: React.AriaAttributes = isDeterminate
    ? {
        'aria-valuenow': Math.round(clamped),
        'aria-valuemin': rangeMin,
        'aria-valuemax': rangeMax,
      }
    : { 'aria-busy': true };

  return (
    <div className={`inline-flex items-center gap-2 ${wrapperClassName}`}>
      <div
        className={`relative w-32 h-2 overflow-hidden rounded bg-gray-300 ${className}`}
        role="progressbar"
        {...ariaProps}
      >
        {isDeterminate ? (
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${percentComplete}%` }}
          />
        ) : (
          <div className="absolute inset-0">
            <div className="animate-indeterminate absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400" />
          </div>
        )}
      </div>
      {isDeterminate && showValue ? (
        <span className="text-xs font-medium text-blue-600" aria-live="polite">
          {Math.round(percentComplete)}%
        </span>
      ) : null}
      <style jsx>{`
        .animate-indeterminate {
          animation: progress-indeterminate 1.4s ease-in-out infinite;
        }

        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
          }

          50% {
            transform: translateX(-10%);
          }

          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}

