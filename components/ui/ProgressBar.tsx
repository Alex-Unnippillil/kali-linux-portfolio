"use client";

import React from 'react';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error' | 'gradient';
export type ProgressBarSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  progress: number;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside';
  animated?: boolean;
  striped?: boolean;
  className?: string;
  ariaLabel?: string;
}

const VARIANT_STYLES: Record<ProgressBarVariant, string> = {
  default: 'bg-cyan-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  gradient: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500',
};

const SIZE_STYLES: Record<ProgressBarSize, { height: string; text: string }> = {
  sm: { height: 'h-1', text: 'text-[10px]' },
  md: { height: 'h-2', text: 'text-xs' },
  lg: { height: 'h-3', text: 'text-xs' },
};

export default function ProgressBar({
  progress,
  variant = 'default',
  size = 'md',
  showLabel = false,
  labelPosition = 'outside',
  animated = false,
  striped = false,
  className = '',
  ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(progress, 100));
  const sizeStyle = SIZE_STYLES[size];
  const variantStyle = VARIANT_STYLES[variant];

  const stripedClass = striped
    ? 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]'
    : '';

  const animatedClass = animated && striped ? 'animate-[progress-stripes_1s_linear_infinite]' : '';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`
          flex-1 overflow-hidden rounded-full
          ${sizeStyle.height}
          bg-white/10 backdrop-blur-sm
          shadow-inner shadow-black/20
        `}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={`
            ${sizeStyle.height}
            ${variantStyle}
            ${stripedClass}
            ${animatedClass}
            rounded-full
            transition-all duration-300 ease-out
            shadow-[0_0_8px_rgba(56,189,248,0.3)]
            relative
          `}
          style={{ width: `${clamped}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />

          {/* Inside label */}
          {showLabel && labelPosition === 'inside' && clamped > 15 && (
            <span className={`absolute right-1 top-1/2 -translate-y-1/2 ${sizeStyle.text} font-bold text-white drop-shadow-sm`}>
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      </div>

      {/* Outside label */}
      {showLabel && labelPosition === 'outside' && (
        <span className={`${sizeStyle.text} font-medium text-white/70 tabular-nums min-w-[3ch] text-right`}>
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
