import React, { useCallback, useEffect, useRef, useState } from 'react';
import Toast from '../../../ui/Toast';

/**
 * Heads up display for games. Provides pause/resume, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({
  onPause,
  onResume,
  onReset,
  muted: externalMuted,
  onToggleSound,
  paused: controlledPaused,
}: {
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  muted?: boolean;
  onToggleSound?: (muted: boolean) => void;
  paused?: boolean;
}) {
  const [pausedState, setPausedState] = useState(controlledPaused ?? false);
  const [muted, setMuted] = useState(externalMuted ?? false);
  const [fps, setFps] = useState(0);
  const frame = useRef(performance.now());
  const count = useRef(0);
  const [toast, setToast] = useState('');
  const pausedByDisconnect = useRef(false);
  const isControlled = controlledPaused !== undefined;

  const currentPaused = isControlled ? controlledPaused! : pausedState;

  const setPaused = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setPausedState(value);
      }
      if (value) onPause?.();
      else onResume?.();
    },
    [isControlled, onPause, onResume],
  );

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

  const togglePause = useCallback(() => {
    setPaused(!currentPaused);
  }, [currentPaused, setPaused]);

  const toggleSound = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      onToggleSound?.(nm);
      return nm;
    });
  }, [onToggleSound]);

  useEffect(() => {
    if (externalMuted !== undefined) {
      setMuted(externalMuted);
    }
  }, [externalMuted]);

  useEffect(() => {
    if (isControlled) {
      setPausedState(controlledPaused ?? false);
    }
  }, [controlledPaused, isControlled]);

  useEffect(() => {
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      setToast('Controller disconnected. Reconnect to resume.');
      setPaused(true);
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        setToast('');
        setPaused(false);
      }
    };
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    window.addEventListener('gamepadconnected', handleConnect);
    return () => {
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
      window.removeEventListener('gamepadconnected', handleConnect);
    };
  }, [onPause, onResume]);

  return (
    <>
      <div className="game-overlay">
        <button onClick={togglePause} aria-label={currentPaused ? 'Resume' : 'Pause'}>
          {currentPaused ? 'Resume' : 'Pause'}
        </button>
        {onReset && (
          <button onClick={onReset} aria-label="Reset game">
            Reset
          </button>
        )}
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
