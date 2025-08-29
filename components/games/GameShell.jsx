"use client";

import React, { useState, useCallback } from 'react';
import useOrientationGuard from '../../hooks/useOrientationGuard';
import useGameInput from '../../hooks/useGameInput';
import usePersistentState from '../usePersistentState';

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
  const [speed, setSpeed] = usePersistentState('game-speed', 1);
  const [muted, setMuted] = usePersistentState('game-muted', false);

  const pause = useCallback(() => {
    setPaused(true);
    onPause && onPause();
  }, [onPause]);

  const resume = useCallback(() => {
    setPaused(false);
    onResume && onResume();
  }, [onResume]);

  const toggleSettings = () => setShowSettings((s) => !s);
  const toggleMute = () => setMuted((m) => !m);

  const handleInput = ({ action, type }) => {
    if (action === 'pause' && type === 'keydown') {
      paused ? resume() : pause();
    }
  };

  useGameInput({ onInput: handleInput });

  return (
    <div className={`game-shell${paused ? ' paused' : ''}${muted ? ' muted' : ''}`}
         data-speed={speed}>
      <div className="game-content">{children}</div>
      {controls && <div className="game-controls">{controls}</div>}
      {showSettings && settings && (
        <div className="game-settings">{settings}</div>
      )}
      <button onClick={paused ? resume : pause} aria-label={paused ? 'Resume' : 'Pause'}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? 'Unmute' : 'Mute'}
      </button>
      <label>
        Speed
        <select
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </label>
      {settings && (
        <button onClick={toggleSettings} aria-label="Settings">
          Settings
        </button>
      )}
    </div>
  );
}
