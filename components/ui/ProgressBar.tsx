import React from 'react';

interface ProgressBarProps {
  progress?: number | null;
  className?: string;
}

export default function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  const isDeterminate = typeof progress === 'number' && Number.isFinite(progress);
  const clamped = isDeterminate ? Math.max(0, Math.min(progress as number, 100)) : null;
  const ariaValueNow = clamped !== null ? Math.round(clamped) : undefined;
  const fillStyle = clamped !== null ? { width: `${clamped}%` } : undefined;

  return (
    <div
      className={`progress-bar relative w-32 h-2 bg-gray-300 rounded overflow-hidden ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      {...(ariaValueNow !== undefined ? { 'aria-valuenow': ariaValueNow } : {})}
    >
      <span
        className={`progress-bar__fill ${
          isDeterminate ? 'progress-bar__fill--determinate' : 'progress-bar__fill--indeterminate'
        }`}
        style={isDeterminate ? fillStyle : undefined}
        aria-hidden="true"
      />
      <style jsx>{`
        .progress-bar__fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #2563eb);
          transform-origin: left center;
        }

        .progress-bar__fill--determinate {
          transition: width 200ms ease-out;
          animation: progress-determinate-pulse 2.4s ease-in-out infinite;
        }

        .progress-bar__fill--indeterminate {
          position: absolute;
          left: -45%;
          width: 45%;
          animation: progress-indeterminate 1.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .progress-bar__fill--determinate {
            animation: none;
            transition: none;
          }

          .progress-bar__fill--indeterminate {
            animation: none;
            left: 25%;
            width: 50%;
          }
        }

        @keyframes progress-determinate-pulse {
          0%,
          100% {
            transform: scaleX(1);
          }

          50% {
            transform: scaleX(0.98);
          }
        }

        @keyframes progress-indeterminate {
          0% {
            left: -45%;
            width: 35%;
          }

          50% {
            left: 20%;
            width: 70%;
          }

          100% {
            left: 100%;
            width: 35%;
          }
        }
      `}</style>
    </div>
  );
}

