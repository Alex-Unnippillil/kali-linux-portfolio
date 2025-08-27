import { useCallback } from 'react';

export default function useGameHaptics() {
  const vibrate = useCallback((pattern = 50) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }, []);

  return { vibrate };
}
