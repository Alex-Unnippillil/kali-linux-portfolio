import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Toast from '../../../ui/Toast';

interface OverlayProps {
  paused?: boolean;
  muted?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onToggleSound?: () => void;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
}

/**
 * Heads up display for games. Provides pause/resume, reset, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({
  paused = false,
  muted = false,
  onPause,
  onResume,
  onToggleSound,
  onReset,
  resetLabel = 'Reset',
  className,
}: OverlayProps) {
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

  const handlePauseToggle = useCallback(() => {
    if (paused) onResume?.();
    else onPause?.();
  }, [paused, onPause, onResume]);

  const handleSoundToggle = useCallback(() => {
    onToggleSound?.();
  }, [onToggleSound]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  useEffect(() => {
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      setToast('Controller disconnected. Reconnect to resume.');
      onPause?.();
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        setToast('');
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
      <div
        className={clsx(
          'absolute top-2 right-2 z-40 flex items-center gap-2 rounded bg-gray-900/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur',
          className,
        )}
      >
        {onReset && (
          <button
            onClick={handleReset}
            type="button"
            className="rounded bg-gray-700 px-2 py-1 transition hover:bg-gray-600 focus:outline-none focus:ring"
          >
            {resetLabel}
          </button>
        )}
        <button
          onClick={handlePauseToggle}
          type="button"
          aria-label={paused ? 'Resume' : 'Pause'}
          className="rounded bg-gray-700 px-2 py-1 transition hover:bg-gray-600 focus:outline-none focus:ring"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={handleSoundToggle}
          type="button"
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="rounded bg-gray-700 px-2 py-1 transition hover:bg-gray-600 focus:outline-none focus:ring"
        >
          {muted ? 'Sound Off' : 'Sound On'}
        </button>
        <span className="rounded bg-gray-800 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide">
          {fps} FPS
        </span>
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
