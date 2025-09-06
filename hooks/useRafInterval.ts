import { useEffect, useRef } from "react";

/**
 * Runs the provided callback roughly every `delay` milliseconds using
 * `requestAnimationFrame` under the hood. The loop is automatically paused
 * when the document is hidden to avoid unnecessary CPU usage when the
 * window is minimized.
 */
export default function useRafInterval(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);
  const delayRef = useRef(delay);

  // Update refs when props change
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  useEffect(() => {
    let frameId: number;
    let last = performance.now();

    const loop = (now: number) => {
      // only run the callback if enough time has passed and the document is visible
      if (!document.hidden && now - last >= delayRef.current) {
        savedCallback.current();
        last = now;
      }
      frameId = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        // reset timer when coming back to foreground
        last = performance.now();
      }
    };

    frameId = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}

