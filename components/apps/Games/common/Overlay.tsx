import React, { useCallback, useEffect, useRef, useState } from 'react';
import Toast from '../../../ui/Toast';

/**
 * Heads up display for games. Provides pause/resume, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({
  onPause,
  onResume,
  paused: externalPaused,
  muted: externalMuted,
  onToggleSound,
  onReset,
}: {
  onPause?: () => void;
  onResume?: () => void;
  paused?: boolean;
  muted?: boolean;
  onToggleSound?: (muted: boolean) => void;
  onReset?: () => void;
}) {
  const [paused, setPaused] = useState(externalPaused ?? false);
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

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const baseline = externalPaused !== undefined ? externalPaused : p;
      const next = !baseline;
      next ? onPause?.() : onResume?.();
      return next;
    });
  }, [externalPaused, onPause, onResume]);

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
    if (externalPaused !== undefined) {
      setPaused(externalPaused);
    }
  }, [externalPaused]);

  useEffect(() => {
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      setToast('Controller disconnected. Reconnect to resume.');
      setPaused(true);
      onPause?.();
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        setToast('');
        setPaused(false);
        onResume?.();
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
      <button type="button" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      {onReset && (
        <button type="button" onClick={onReset} aria-label="Reset Game">
          Reset
        </button>
      )}
      <button type="button" onClick={toggleSound} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? 'Unmute' : 'Mute'}
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
