import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export default function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 100));
  return (
    <div
      className={`w-32 h-2 bg-[color:var(--kali-progress-track)] rounded ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[color:var(--kali-progress-fill)] transition-all duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

