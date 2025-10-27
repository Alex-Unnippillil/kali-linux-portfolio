import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_PING_PATH = '/favicon.ico';

const buildPingUrl = (customPath?: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (customPath) {
    try {
      const url = new URL(customPath, window.location.href);
      return url.toString();
    } catch {
      return undefined;
    }
  }
  try {
    return new URL(DEFAULT_PING_PATH, window.location.href).toString();
  } catch {
    return undefined;
  }
};

export interface NetworkStatusOptions {
  pingUrl?: string;
}

const prefersOnline = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  if (typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
};

export function useNetworkStatus(options?: NetworkStatusOptions): boolean {
  const initial = prefersOnline();
  const [online, setOnline] = useState<boolean>(initial);
  const pingUrl = useMemo(() => buildPingUrl(options?.pingUrl), [options?.pingUrl]);
  const lastKnownStatus = useRef<boolean>(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;

    const confirmReachability = async (): Promise<void> => {
      if (!pingUrl) return;
      try {
        const response = await fetch(pingUrl, { method: 'HEAD', cache: 'no-store' });
        if (!cancelled && response.ok) {
          lastKnownStatus.current = true;
          setOnline(true);
        }
      } catch {
        if (!cancelled) {
          lastKnownStatus.current = false;
          setOnline(false);
        }
      }
    };

    const updateFromNavigator = (): void => {
      const hasConnection = prefersOnline();
      lastKnownStatus.current = hasConnection;
      setOnline(hasConnection);
      if (hasConnection) {
        void confirmReachability();
      }
    };

    updateFromNavigator();

    window.addEventListener('online', updateFromNavigator);
    window.addEventListener('offline', updateFromNavigator);

    if (lastKnownStatus.current) {
      void confirmReachability();
    }

    return () => {
      cancelled = true;
      window.removeEventListener('online', updateFromNavigator);
      window.removeEventListener('offline', updateFromNavigator);
    };
  }, [pingUrl]);

  return online;
}

export default useNetworkStatus;
