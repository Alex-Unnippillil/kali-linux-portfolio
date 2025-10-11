"use client";

import React from 'react';

interface GameToolbarProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset?: () => void;
  muted: boolean;
  onToggleMute: () => void;
  children?: React.ReactNode;
}

const buttonClass =
  'px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring';

const GameToolbar: React.FC<GameToolbarProps> = ({
  paused,
  onTogglePause,
  onReset,
  muted,
  onToggleMute,
  children,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onTogglePause}
      className={buttonClass}
      aria-pressed={paused}
    >
      {paused ? 'Resume' : 'Pause'}
    </button>
    {onReset && (
      <button type="button" onClick={onReset} className={buttonClass}>
        Reset
      </button>
    )}
    <button
      type="button"
      onClick={onToggleMute}
      className={buttonClass}
      aria-pressed={muted}
    >
      {muted ? 'Sound Off' : 'Sound On'}
    </button>
    {children}
  </div>
);

export default GameToolbar;
