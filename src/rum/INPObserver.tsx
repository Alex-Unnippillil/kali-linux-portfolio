import { useEffect } from 'react';

const RUM_ENDPOINT = '/api/rum';

const INPObserver = (): null => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof PerformanceObserver === 'undefined') return;

    const supportedTypes = (PerformanceObserver as typeof PerformanceObserver & {
      supportedEntryTypes?: string[];
    }).supportedEntryTypes;

    if (!supportedTypes || !supportedTypes.includes('event')) {
      return;
    }

    let maxDuration = 0;
    let reported = false;

    const sendMeasurement = () => {
      if (
        reported ||
        maxDuration <= 0 ||
        typeof navigator === 'undefined' ||
        typeof navigator.sendBeacon !== 'function'
      ) {
        return;
      }

      const payload = JSON.stringify({
        metric: 'INP',
        duration: maxDuration,
        path: window.location?.pathname ?? '',
        timestamp: Date.now(),
      });

      try {
        const body = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(RUM_ENDPOINT, body);
        reported = true;
      } catch {
        // Ignore failures; sendBeacon is best-effort.
      }
    };

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (!entries.length) return;

      for (const entry of entries) {
        const duration = entry.duration;
        if (duration > maxDuration) {
          maxDuration = duration;
        }
      }
    });

    try {
      observer.observe({ type: 'event', buffered: true } as PerformanceObserverInit);
    } catch {
      observer.disconnect();
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendMeasurement();
      }
    };

    const handlePageHide = () => {
      sendMeasurement();
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendMeasurement();
      observer.disconnect();
    };
  }, []);

  return null;
};

export default INPObserver;
