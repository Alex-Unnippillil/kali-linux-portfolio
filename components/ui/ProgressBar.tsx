import React from 'react';
import clsx from 'clsx';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  min?: number;
  max?: number;
  indeterminate?: boolean;
  reduceMotion?: boolean;
}

const FILL_GRADIENT =
  'linear-gradient(90deg, rgba(15,154,216,1) 0%, rgba(70,209,255,1) 50%, rgba(15,154,216,1) 100%)';

export default function ProgressBar({
  value,
  min = 0,
  max = 100,
  indeterminate = false,
  reduceMotion = false,
  className,
  style,
  ...rest
}: ProgressBarProps) {
  const range = Math.max(max - min, 1);
  const numericValue =
    typeof value === 'number' && Number.isFinite(value) ? value : min;
  const clamped = Math.min(Math.max(numericValue, min), max);
  const percent = ((clamped - min) / range) * 100;

  const ariaProps = indeterminate
    ? { 'aria-valuemin': min, 'aria-valuemax': max }
    : {
        'aria-valuenow': Math.round(percent),
        'aria-valuemin': min,
        'aria-valuemax': max,
      };

  const fillStyle: React.CSSProperties = {
    width: indeterminate ? '40%' : `${percent}%`,
    backgroundImage: FILL_GRADIENT,
    backgroundSize: '200% 100%',
    boxShadow: '0 0 12px rgba(70, 209, 255, 0.35)',
    ...(indeterminate && reduceMotion ? { left: '30%' } : {}),
  };

  if (reduceMotion) {
    fillStyle.transition = 'none';
  }

  return (
    <div
      role="progressbar"
      className={clsx(
        'progress-bar relative h-2 w-full overflow-hidden rounded-sm border border-[#0d374d] bg-[#071520] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
        className
      )}
      style={style}
      {...ariaProps}
      {...rest}
    >
      <div
        aria-hidden="true"
        className={clsx(
          'progress-bar__fill absolute left-0 top-0 h-full rounded-sm',
          !indeterminate && !reduceMotion && 'transition-[width] duration-300 ease-out',
          indeterminate && !reduceMotion && 'progress-bar__fill--indeterminate'
        )}
        style={fillStyle}
      />
      <style jsx>{`
        .progress-bar {
          background-image: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08),
            rgba(0, 0, 0, 0.3)
          );
        }
        .progress-bar__fill {
          background-position: 0% 0%;
        }
        .progress-bar__fill--indeterminate {
          animation: kali-progress-indeterminate 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes kali-progress-indeterminate {
          0% {
            transform: translateX(-60%);
          }
          50% {
            transform: translateX(-5%);
          }
          100% {
            transform: translateX(125%);
          }
        }
      `}</style>
    </div>
  );
}
