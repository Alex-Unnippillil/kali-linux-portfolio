"use client";

import { useEffect, useState } from 'react';
import {
  getFavoriteAppIds,
  FAVORITE_APPS_EVENT,
  FAVORITE_APPS_KEY,
} from '../utils/appPersistence';

const useFavoriteApps = () => {
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteAppIds());

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setFavorites(detail);
      } else {
        setFavorites(getFavoriteAppIds());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === FAVORITE_APPS_KEY) {
        setFavorites(getFavoriteAppIds());
      }
    };

    window.addEventListener(FAVORITE_APPS_EVENT, handleUpdate as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(FAVORITE_APPS_EVENT, handleUpdate as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return favorites;
};

export default useFavoriteApps;
