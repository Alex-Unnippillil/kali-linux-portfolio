import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../ui/Toaster';

/**
 * Heads up display for games. Provides pause/resume, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({
  onPause,
  onResume,
  muted: externalMuted,
  onToggleSound,
}: {
  onPause?: () => void;
  onResume?: () => void;
  muted?: boolean;
  onToggleSound?: (muted: boolean) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(externalMuted ?? false);
  const [fps, setFps] = useState(0);
  const frame = useRef(performance.now());
  const count = useRef(0);
  const toast = useToast();
  const pausedByDisconnect = useRef(false);
  const disconnectToastId = useRef<string | null>(null);

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
      const np = !p;
      np ? onPause?.() : onResume?.();
      return np;
    });
  }, [onPause, onResume]);

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
    const handleDisconnect = () => {
      pausedByDisconnect.current = true;
      disconnectToastId.current = toast.error(
        'Controller disconnected. Reconnect to resume.',
        { duration: Number.POSITIVE_INFINITY },
      );
      setPaused(true);
      onPause?.();
    };
    const handleConnect = () => {
      if (pausedByDisconnect.current) {
        pausedByDisconnect.current = false;
        if (disconnectToastId.current) {
          toast.dismiss(disconnectToastId.current);
          disconnectToastId.current = null;
        }
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
  }, [onPause, onResume, toast]);

  useEffect(
    () => () => {
      if (disconnectToastId.current) {
        toast.dismiss(disconnectToastId.current);
        disconnectToastId.current = null;
      }
    },
    [toast],
  );

  return (
    <>
      <div className="game-overlay">
        <button onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleSound} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? 'Sound' : 'Mute'}
        </button>
        <span className="fps">{fps} FPS</span>
      </div>
    </>
  );
}
