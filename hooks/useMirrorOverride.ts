import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mirrorOverride';

export function useMirrorOverride() {
  const [override, setOverrideState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setOverrideState(stored);
  }, []);

  const set = (url: string) => {
    window.localStorage.setItem(STORAGE_KEY, url);
    setOverrideState(url);
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setOverrideState(null);
  };

  return { override, setOverride: set, reset };
}

export default useMirrorOverride;
