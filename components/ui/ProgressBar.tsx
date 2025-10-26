import React, { useId } from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  label?: string;
  description?: string;
}

export default function ProgressBar({
  progress,
  className = '',
  label,
  description,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 100));
  const baseId = useId();
  const labelId = label ? `${baseId}-label` : undefined;
  const descriptionId = description ? `${baseId}-description` : undefined;

  return (
    <div className={`flex flex-col gap-1 w-32 ${className}`}>
      <div
        className="w-full h-3 bg-gray-300 rounded"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? (
        <span id={labelId} className="text-xs text-gray-700">
          {label}
        </span>
      ) : null}
      {description ? (
        <span id={descriptionId} className="text-xs text-gray-500">
          {description}
        </span>
      ) : null}
    </div>
  );
}

