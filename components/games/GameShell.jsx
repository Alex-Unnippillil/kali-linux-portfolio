"use client";

import React, { useState, useCallback } from 'react';
import useOrientationGuard from '../../hooks/useOrientationGuard';

/**
 * Generic shell for browser games. Exposes slots for the game content,
 * virtual controls and a settings panel. Handles pause/resume logic and
 * reacts to device orientation changes.
 */
export default function GameShell({
  children,
  controls = null,
  settings = null,
  onPause,
  onResume,
}) {
  useOrientationGuard();

  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const pause = useCallback(() => {
    setPaused(true);
    onPause && onPause();
  }, [onPause]);

  const resume = useCallback(() => {
    setPaused(false);
    onResume && onResume();
  }, [onResume]);

  const toggleSettings = () => setShowSettings((s) => !s);

  return (
    <div className={`game-shell${paused ? ' paused' : ''}`}>
      <div className="game-content">{children}</div>
      {controls && <div className="game-controls">{controls}</div>}
      {showSettings && settings && (
        <div className="game-settings">{settings}</div>
      )}
      <button onClick={paused ? resume : pause} aria-label={paused ? 'Resume' : 'Pause'}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      {settings && (
        <button onClick={toggleSettings} aria-label="Settings">
          Settings
        </button>
      )}
    </div>
  );
}
