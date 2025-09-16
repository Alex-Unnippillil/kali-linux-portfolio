import { useEffect } from 'react';

declare global {
  interface Window {
    manualRefresh?: () => Promise<void>;
  }
}

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
};

const SW = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let active = true;

    const register = async () => {
      try {
        const registration =
          (await navigator.serviceWorker.register('/sw.js')) as PeriodicSyncRegistration;

        if (!active) return;

        window.manualRefresh = () => registration.update();

        const periodicSync = registration.periodicSync;

        if (periodicSync) {
          try {
            if ('permissions' in navigator && navigator.permissions?.query) {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync',
                // The periodic background sync permission type is not yet in lib.dom.d.ts.
              } as unknown as PermissionDescriptor);

              if (!active) return;

              if (status.state === 'granted') {
                await periodicSync.register('content-sync', {
                  minInterval: 24 * 60 * 60 * 1000,
                });
                return;
              }
            }
          } catch {
            // Ignore periodic sync errors; fall back to a manual update.
          }
        }

        await registration.update();
      } catch (error) {
        console.error('Service worker registration failed', error);
      }
    };

    register().catch((error) => {
      console.error('Service worker setup failed', error);
    });

    return () => {
      active = false;
      if (window.manualRefresh) {
        delete window.manualRefresh;
      }
    };
  }, []);

  return null;
};

export default SW;

