import { useEffect, useState } from 'react';

const STORAGE_KEY = 'do-not-disturb';

export function useDoNotDisturb() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }, [enabled]);

  return [enabled, setEnabled] as const;
}

export default useDoNotDisturb;
