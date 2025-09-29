import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  ariaLabel?: string;
}

export default function ProgressBar({ progress, className = '', ariaLabel = 'Progress' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 100));
  return (
    <div
      className={`w-32 h-2 bg-gray-300 rounded ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="h-full bg-blue-500 transition-all duration-medium ease-motion"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

