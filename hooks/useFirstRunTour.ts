import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeLocalStorage } from '../utils/safeStorage';
import { useSettings } from './useSettings';

export const FIRST_RUN_TOUR_STORAGE_KEY = 'first-run-tour-status';

type StoredStatus = 'completed' | 'skipped';
export type FirstRunTourStatus = StoredStatus | 'pending';

const isStoredStatus = (value: unknown): value is StoredStatus =>
  value === 'completed' || value === 'skipped';

const readStoredStatus = (): StoredStatus | null => {
  try {
    const stored = safeLocalStorage?.getItem(FIRST_RUN_TOUR_STORAGE_KEY);
    return isStoredStatus(stored) ? stored : null;
  } catch (error) {
    console.warn('Unable to read first run tour status', error);
    return null;
  }
};

export default function useFirstRunTour() {
  const { reducedMotion } = useSettings();
  const [status, setStatus] = useState<StoredStatus | null>(() => readStoredStatus());

  useEffect(() => {
    try {
      if (!safeLocalStorage) return;
      if (status) {
        safeLocalStorage.setItem(FIRST_RUN_TOUR_STORAGE_KEY, status);
      } else {
        safeLocalStorage.removeItem(FIRST_RUN_TOUR_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Unable to persist first run tour status', error);
    }
  }, [status]);

  const complete = useCallback(() => {
    setStatus('completed');
  }, []);

  const skip = useCallback(() => {
    setStatus('skipped');
  }, []);

  const reset = useCallback(() => {
    setStatus(null);
  }, []);

  const shouldShow = useMemo(() => !status && !reducedMotion, [status, reducedMotion]);

  return {
    status: (status ?? 'pending') as FirstRunTourStatus,
    shouldShow,
    complete,
    skip,
    reset,
  };
}
