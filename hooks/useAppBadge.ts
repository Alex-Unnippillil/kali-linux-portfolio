import { useCallback, useEffect, useState } from 'react';

type BadgingNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

const getBadgingNavigator = (): BadgingNavigator | null => {
  if (typeof navigator === 'undefined') return null;
  return navigator as BadgingNavigator;
};

const clampBadgeValue = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(9999, Math.floor(value)));
};

const useAppBadge = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const nav = getBadgingNavigator();
    setIsSupported(Boolean(nav?.setAppBadge));
  }, []);

  const setBadge = useCallback(async (value: number) => {
    const nav = getBadgingNavigator();
    if (!nav?.setAppBadge) return;
    const safeValue = clampBadgeValue(value);
    try {
      if (safeValue > 0) {
        await nav.setAppBadge(safeValue);
      } else {
        if (typeof nav.clearAppBadge === 'function') {
          await nav.clearAppBadge();
        } else {
          await nav.setAppBadge(0);
        }
      }
    } catch {
      // Swallow errors to avoid hard failures on unsupported or unstable implementations.
    }
  }, []);

  const clearBadge = useCallback(async () => {
    const nav = getBadgingNavigator();
    if (!nav) return;
    try {
      if (typeof nav.clearAppBadge === 'function') {
        await nav.clearAppBadge();
      } else if (typeof nav.setAppBadge === 'function') {
        await nav.setAppBadge(0);
      }
    } catch {
      // Ignore failures to keep the UI responsive even if the API misbehaves.
    }
  }, []);

  return {
    isSupported,
    setBadge,
    clearBadge,
  };
};

export default useAppBadge;
