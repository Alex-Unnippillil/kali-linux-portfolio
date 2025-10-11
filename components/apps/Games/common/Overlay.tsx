import React, { useCallback, useEffect, useRef, useState } from 'react';
import Toast from '../../../ui/Toast';

/**
 * Heads up display for games. Provides pause/resume, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({
  onPause,
  onResume,
  muted: externalMuted,
  onToggleSound,
  paused: externalPaused,
  onReset,
}: {
  onPause?: () => void;
  onResume?: () => void;
  muted?: boolean;
  onToggleSound?: (muted: boolean) => void;
  paused?: boolean;
  onReset?: () => void;
}) {
  const [internalPaused, setInternalPaused] = useState(externalPaused ?? false);
  const paused = externalPaused ?? internalPaused;
  const [muted, setMuted] = useState(externalMuted ?? false);
  const [fps, setFps] = useState(0);
  const frame = useRef(performance.now());
  const count = useRef(0);
  const [toast, setToast] = useState('');
  const pausedByDisconnect = useRef(false);

  // track fps using requestAnimationFrame
  useEffect(() => {
    let raf: number;
    const measure = (now: number) => {
      count.current += 1;
      if (now - frame.current >= 1000) {
        setFps(count.current);
        count.current = 0;
        frame.current = now;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setPausedState = useCallback(
    (value: boolean) => {
      setInternalPaused(value);
      if (value) onPause?.();
      else onResume?.();
    },
    [onPause, onResume],
  );

  const togglePause = useCallback(() => {
    setPausedState(!paused);
  }, [paused, setPausedState]);

  const toggleSound = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      onToggleSound?.(nm);
      return nm;
    });
  }, [onToggleSound]);

  useEffect(() => {
    if (externalPaused !== undefined) {
      setInternalPaused(externalPaused);
    }
  }, [externalPaused]);

  useEffect(() => {
    if (externalMuted !== undefined) {
      setMuted(externalMuted);
    }
  }, [externalMuted]);

  useEffect(() => {
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      setToast('Controller disconnected. Reconnect to resume.');
      setPausedState(true);
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        setToast('');
        setPausedState(false);
      }
    };
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    window.addEventListener('gamepadconnected', handleConnect);
    return () => {
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
      window.removeEventListener('gamepadconnected', handleConnect);
    };
  }, [setPausedState]);

  return (
    <>
      <div className="game-overlay">
        {onReset && (
          <button onClick={onReset} aria-label="Reset">
            Reset
          </button>
        )}
        <button onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleSound} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? 'Sound' : 'Mute'}
        </button>
        <span className="fps">{fps} FPS</span>
      </div>
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast('')}
          duration={1000000}
        />
      )}
    </>
  );
}
