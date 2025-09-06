import { isBrowser } from '@/utils/env';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'do-not-disturb';

export function useDoNotDisturb() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!isBrowser()) return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }, [enabled]);

  return [enabled, setEnabled] as const;
}

export default useDoNotDisturb;
