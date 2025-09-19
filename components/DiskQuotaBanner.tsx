"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import useDiskQuota from '../hooks/useDiskQuota';
import { safeLocalStorage } from '../utils/safeStorage';

const DISMISS_PREFIX = 'disk-quota-dismissed';
const CLEANUP_FILTER_KEY = 'trash-filter';
const PROFILE_KEYS = [
  'active-profile',
  'profile',
  'profile-id',
  'profileId',
  'desktop-profile',
  'profileName',
  'user-profile',
];
const SAFE_MODE_KEYS = ['safe-mode', 'safeMode'];

const readDismissed = (key: string): boolean => {
  try {
    return safeLocalStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const getProfileId = (): string => {
  if (typeof window === 'undefined') return 'default';
  for (const key of PROFILE_KEYS) {
    try {
      const value = safeLocalStorage?.getItem(key) ?? window.localStorage?.getItem(key);
      if (value && value.trim()) return value;
    } catch {
      /* ignore */
    }
  }
  return 'default';
};

const isTruthy = (value: string | null | undefined): boolean =>
  value === 'true' || value === '1';

const isSafeMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    for (const key of SAFE_MODE_KEYS) {
      if (isTruthy(safeLocalStorage?.getItem(key))) return true;
      if (isTruthy(window.localStorage?.getItem(key))) return true;
      if (isTruthy(window.sessionStorage?.getItem(key))) return true;
    }
  } catch {
    /* ignore */
  }

  if (typeof document !== 'undefined') {
    const dataset = document.documentElement?.dataset;
    if (dataset && isTruthy(dataset.safeMode ?? dataset.safemode)) {
      return true;
    }
  }

  const globalFlags = ['__SAFE_MODE__', '__KALI_SAFE_MODE__'];
  for (const flag of globalFlags) {
    if ((window as Record<string, unknown>)[flag] === true) {
      return true;
    }
  }

  try {
    const params = new URLSearchParams(window.location.search || '');
    if (isTruthy(params.get('safe-mode')) || isTruthy(params.get('safeMode'))) {
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
};

const formatBytes = (bytes: number | null): string => {
  if (bytes === null || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value < 10 && unitIndex > 0 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const DiskQuotaBanner: React.FC = () => {
  const { supported, usage, quota, loading, error } = useDiskQuota();
  const [profileId] = useState(() => getProfileId());
  const dismissalKey = useMemo(
    () => `${DISMISS_PREFIX}:${profileId}`,
    [profileId],
  );
  const [dismissed, setDismissed] = useState(() => readDismissed(dismissalKey));

  useEffect(() => {
    setDismissed(readDismissed(dismissalKey));
  }, [dismissalKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key === dismissalKey) {
        setDismissed(readDismissed(dismissalKey));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dismissalKey]);

  const percentUsed = quota && usage !== null ? Math.round((usage / quota) * 100) : 0;
  const safeMode = isSafeMode();

  const shouldShow =
    supported &&
    !loading &&
    !error &&
    !dismissed &&
    !safeMode &&
    usage !== null &&
    quota !== null &&
    quota > 0 &&
    percentUsed >= 80;

  const setDismissedFlag = useCallback(() => {
    try {
      safeLocalStorage?.setItem(dismissalKey, 'true');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, [dismissalKey]);

  const handleDismiss = () => {
    setDismissedFlag();
  };

  const handleClearSpace = () => {
    try {
      sessionStorage.setItem(CLEANUP_FILTER_KEY, 'expiring');
    } catch {
      /* ignore */
    }
    setDismissedFlag();
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'trash' }));
  };

  if (!shouldShow) return null;

  const usageLabel = formatBytes(usage);
  const quotaLabel = formatBytes(quota);

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-[60] w-11/12 max-w-xl -translate-x-1/2 rounded-md border border-red-500 bg-red-900/90 text-sm text-white shadow-lg backdrop-blur"
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <p className="font-semibold">
            Storage space is running low ({percentUsed}% used).
          </p>
          <p className="text-xs text-red-100">
            Using {usageLabel} of {quotaLabel}. Clear unused files to keep the desktop responsive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearSpace}
            className="rounded bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Clear space
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded border border-transparent px-2 py-1 text-xs text-red-100 transition hover:border-red-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiskQuotaBanner;
