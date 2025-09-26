"use client";

import { useEffect, useState } from 'react';
import {
  getRecentAppIds,
  RECENT_APPS_EVENT,
  RECENT_APPS_KEY,
} from '../utils/appPersistence';

const useRecentApps = () => {
  const [recent, setRecent] = useState<string[]>(() => getRecentAppIds());

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setRecent(detail);
      } else {
        setRecent(getRecentAppIds());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECENT_APPS_KEY) {
        setRecent(getRecentAppIds());
      }
    };

    window.addEventListener(RECENT_APPS_EVENT, handleUpdate as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(RECENT_APPS_EVENT, handleUpdate as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return recent;
};

export default useRecentApps;
