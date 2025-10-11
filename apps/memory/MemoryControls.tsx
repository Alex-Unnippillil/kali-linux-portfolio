'use client';

import React from 'react';

interface MemoryControlsProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  muted: boolean;
  onToggleSound: () => void;
  labelPrefix?: string;
  className?: string;
}

const baseButtonClasses =
  'px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring disabled:opacity-50 disabled:cursor-not-allowed';

const MemoryControls: React.FC<MemoryControlsProps> = ({
  paused,
  onTogglePause,
  onReset,
  muted,
  onToggleSound,
  labelPrefix = '',
  className = '',
}) => {
  const prefix = labelPrefix ? `${labelPrefix} ` : '';

  return (
    <div
      className={`memory-controls flex flex-wrap items-center gap-2 ${className}`.trim()}
      role="group"
      aria-label={`${prefix}game controls`}
    >
      <button
        type="button"
        onClick={onReset}
        aria-label={`${prefix}reset game`}
        className={baseButtonClasses}
        data-testid="memory-reset"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onTogglePause}
        aria-label={`${prefix}${paused ? 'resume game' : 'pause game'}`}
        className={baseButtonClasses}
        data-testid="memory-pause"
        aria-pressed={paused}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={onToggleSound}
        aria-label={`${prefix}${muted ? 'unmute sound' : 'mute sound'}`}
        className={baseButtonClasses}
        data-testid="memory-sound"
        aria-pressed={muted}
      >
        Sound: {muted ? 'Off' : 'On'}
      </button>
    </div>
  );
};

export default MemoryControls;

