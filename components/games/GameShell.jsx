import React, { useEffect, useState, useRef } from 'react';
import VirtualControls from './VirtualControls';
import useGameInput from '../../hooks/useGameInput';
import usePersistedState from '../../hooks/usePersistedState';
import useOrientationGuard from '../../hooks/useOrientationGuard';

/**
 * Generic shell that wraps simple canvas games. It provides:
 *  - Pause / resume handling
 *  - Auto pause when the tab becomes hidden
 *  - Settings persistence via usePersistedState
 *  - Optional FTUE overlay on first load
 *  - Rendering of on screen virtual controls
 */
export default function GameShell({
  gameId,
  children,
  initialSettings = {},
}) {
  const [paused, setPaused] = useState(false);
  const [showFtue, setShowFtue] = usePersistedState(`game:${gameId}:ftue`, true);
  const [settings, setSettings] = usePersistedState(
    `game:${gameId}:settings`,
    initialSettings
  );
  const { lastInput, hideVirtualControls } = useGameInput();
  const orientationOk = useOrientationGuard();

  // Auto pause on tab hide
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // hide FTUE after first interaction
  const dismissFtue = () => setShowFtue(false);

  return (
    <div className="relative w-full h-full select-none">
      {!orientationOk && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-50">
          Rotate your device
        </div>
      )}
      {showFtue && (
        <div
          className="absolute inset-0 bg-black/70 text-white flex items-center justify-center z-40"
          onClick={dismissFtue}
          data-testid="ftue-overlay"
        >
          Tap to start
        </div>
      )}
      {paused && (
        <div
          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center z-30"
          data-testid="pause-overlay"
        >
          Paused
        </div>
      )}
      <div className="w-full h-full" aria-hidden={paused}>
        {React.cloneElement(children, {
          settings,
          setSettings,
          paused,
          setPaused,
        })}
      </div>
      {!hideVirtualControls && <VirtualControls lastInput={lastInput} />}
    </div>
  );
}
