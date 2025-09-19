import { useCallback, useEffect, useState } from 'react';
import {
  APP_USAGE_STORAGE_KEY,
  APP_USAGE_UPDATED_EVENT,
  AppUsageEventDetail,
  AppUsageMap,
  AppUsageRecord,
  readAppUsage,
} from '../utils/appUsage';

const defaultRecord: AppUsageRecord = { count: 0, lastOpened: 0 };

export const useAppUsage = () => {
  const [usage, setUsage] = useState<AppUsageMap>(() => readAppUsage());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== APP_USAGE_STORAGE_KEY) {
        return;
      }
      setUsage(readAppUsage());
    };

    const handleUsageUpdate = (event: Event) => {
      const { detail } = event as CustomEvent<AppUsageEventDetail | undefined>;
      if (detail && detail.id) {
        setUsage((prev) => ({ ...prev, [detail.id]: detail.usage }));
      } else {
        setUsage(readAppUsage());
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(APP_USAGE_UPDATED_EVENT, handleUsageUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(APP_USAGE_UPDATED_EVENT, handleUsageUpdate as EventListener);
    };
  }, []);

  const getUsageFor = useCallback(
    (id: string): AppUsageRecord => usage[id] ?? { ...defaultRecord },
    [usage],
  );

  const refreshUsage = useCallback(() => {
    setUsage(readAppUsage());
  }, []);

  return { usage, getUsageFor, refreshUsage };
};

export type UseAppUsageReturn = ReturnType<typeof useAppUsage>;
