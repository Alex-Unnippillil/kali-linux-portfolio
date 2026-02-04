"use client";

import React, { useState, useCallback, ReactNode, useRef } from 'react';
import useOrientationGuard from '../../hooks/useOrientationGuard';
import useGameInput from '../../hooks/useGameInput';
import usePersistentState from '../../hooks/usePersistentState';
import { exportGameSettings, importGameSettings } from '../../utils/gameSettings';

interface GameShellProps {
  game: string;
  children: ReactNode;
  controls?: ReactNode;
  settings?: ReactNode;
  onPause?: () => void;
  onResume?: () => void;
  isFocused?: boolean;
}

/**
 * Generic shell for browser games. Exposes slots for the game content,
 * virtual controls and a settings panel. Handles pause/resume logic and
 * reacts to device orientation changes.
 */
export default function GameShell({
  game,
  children,
  controls = null,
  settings = null,
  onPause = () => {},
  onResume = () => {},
  isFocused = true,
}: GameShellProps) {
  useOrientationGuard();

  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = usePersistentState('game-speed', 1);
  const [muted, setMuted] = usePersistentState('game-muted', false);

  const pause = useCallback(() => {
    setPaused(true);
    onPause();
  }, [onPause]);

  const resume = useCallback(() => {
    setPaused(false);
    onResume();
  }, [onResume]);

  const toggleSettings = () => setShowSettings((s: boolean) => !s);
  const toggleMute = () => setMuted((m: boolean) => !m);

  const handleInput = ({ action, type }: { action: string; type: string }) => {
    if (action === 'pause' && type === 'keydown') {
      paused ? resume() : pause();
    }
  };

  useGameInput({ onInput: handleInput, game, isFocused });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportGameSettings(game);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game}-settings.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    importGameSettings(game, text);
  };

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
      <button onClick={handleExport} aria-label="Export Settings">
        Export
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        aria-label="Import Settings"
      >
        Import
      </button>
      <input
        type="file"
        accept="application/json"
        ref={fileRef}
        aria-label="Import settings file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file) handleImport(file);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
}
