import { useState } from 'react';

/**
 * Simple First Time User Experience hook. Shows overlay until dismissed once.
 */
export function useFTUE(key: string) {
  const storageKey = `ftue-${key}`;
  const [seen, setSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(storageKey) === '1';
  });

  const showFTUE = !seen;
  const dismissFTUE = () => {
    setSeen(true);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
  };

  return { showFTUE, dismissFTUE } as const;
}

export default useFTUE;
