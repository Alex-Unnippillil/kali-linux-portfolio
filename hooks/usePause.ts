import { useState, useCallback, useEffect } from 'react';

/**
 * Manage paused state for a game. Automatically pauses when the document
 * becomes hidden. Exposes pause and resume callbacks.
 */
export function usePause(onPause?: () => void, onResume?: () => void) {
  const [paused, setPaused] = useState(false);

  const pause = useCallback(() => {
    setPaused(true);
    onPause?.();
  }, [onPause]);

  const resume = useCallback(() => {
    setPaused(false);
    onResume?.();
  }, [onResume]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        pause();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pause]);

  return { paused, pause, resume };
}

export default usePause;
