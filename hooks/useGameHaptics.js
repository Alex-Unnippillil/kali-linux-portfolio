import { useCallback } from 'react';

// Provides a simple wrapper around the Vibration API if available.
export default function useGameHaptics() {
  const vibrate = useCallback((pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  return { vibrate };
}
