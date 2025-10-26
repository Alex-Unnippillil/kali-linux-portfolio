import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  label?: React.ReactNode;
}

export default function ProgressBar({ progress, className = '', label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 100));
  return (
    <div className={`w-32 ${className}`}>
      <div
        className="h-3 sm:h-2 bg-gray-200 rounded"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-blue-600 transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? <div className="mt-1 text-xs text-gray-800">{label}</div> : null}
    </div>
  );
}

