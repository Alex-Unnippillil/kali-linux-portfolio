import { useEffect, useRef } from 'react';

/**
 * Simple game loop helper that provides frame-time delta in seconds to the
 * callback. The loop runs only while `running` is true.
 */
export default function useGameLoop(
  callback: (delta: number) => void,
  running = true,
) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!running) return undefined;
    if (typeof window === 'undefined') return undefined;
    let raf: number;
    let last = performance.now();
    const loop = (now: number) => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        last = now;
        raf = requestAnimationFrame(loop);
        return;
      }
      const deltaMs = now - last;
      const delta = Math.min(Math.max(deltaMs, 0) / 1000, 0.05);
      last = now;
      cb.current(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
