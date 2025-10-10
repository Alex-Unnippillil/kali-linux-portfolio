'use client';

import { useEffect, useRef } from 'react';
import useNotifications from './useNotifications';

const SERVICE_WORKER_APP_ID = 'system-update';
const SERVICE_WORKER_NOTIFICATION_ID = 'service-worker-update';

const useServiceWorkerRegistration = () => {
  const { pushNotification, dismissNotification, markAllRead } = useNotifications();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const serviceWorker = navigator.serviceWorker;
    let registrationRef: ServiceWorkerRegistration | null = null;
    let updateNotificationId: string | null = null;
    let updateFoundHandler: (() => void) | null = null;

    const notifyUpdateReady = (registration: ServiceWorkerRegistration) => {
      if (!isMountedRef.current) return;
      if (!navigator.serviceWorker?.controller) return;
      if (updateNotificationId) return;

      const notificationId = pushNotification({
        appId: SERVICE_WORKER_APP_ID,
        title: 'Update ready',
        body: 'A new version is available. Reload to apply the latest updates.',
        priority: 'high',
        hints: {
          category: 'service-worker',
          actions: ['reload'],
        },
        actions: [
          {
            id: SERVICE_WORKER_NOTIFICATION_ID,
            label: 'Reload',
            onSelect: () => {
              try {
                if (typeof window.manualRefresh === 'function') {
                  window.manualRefresh();
                } else {
                  registration.update().catch(() => {});
                }
              } catch (error) {
                console.error('Service worker reload failed', error);
              }
              dismissNotification(SERVICE_WORKER_APP_ID, notificationId);
            },
          },
        ],
      });

      updateNotificationId = notificationId;
    };

    const trackInstalling = (
      worker: ServiceWorker,
      registration: ServiceWorkerRegistration,
    ) => {
      const handleStateChange = () => {
        if (!isMountedRef.current) return;
        if (worker.state === 'installed') {
          notifyUpdateReady(registration);
        }
        if (worker.state === 'redundant' || worker.state === 'activated') {
          worker.removeEventListener('statechange', handleStateChange);
        }
      };

      worker.addEventListener('statechange', handleStateChange);
    };

    const handleControllerChange = () => {
      if (updateNotificationId) {
        markAllRead(SERVICE_WORKER_APP_ID);
        dismissNotification(SERVICE_WORKER_APP_ID, updateNotificationId);
        updateNotificationId = null;
      }
    };

    const attemptPeriodicSync = async (registration: ServiceWorkerRegistration) => {
      const periodicRegistration = registration as ServiceWorkerRegistration & {
        periodicSync?: {
          register: (tag: string, options: { minInterval: number }) => Promise<void>;
        };
      };

      if (periodicRegistration.periodicSync) {
        try {
          const status = await navigator.permissions.query({
            name: 'periodic-background-sync',
          } as unknown as PermissionDescriptor);
          if (status.state === 'granted') {
            await periodicRegistration.periodicSync.register('content-sync', {
              minInterval: 24 * 60 * 60 * 1000,
            });
            return;
          }
        } catch {
          // ignore and fall back to manual updates
        }
      }
      try {
        await registration.update();
      } catch {
        // ignore - update failures are non-fatal here
      }
    };

    serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const register = async () => {
      try {
        const registration = await serviceWorker.register('/sw.js');
        registrationRef = registration;
        window.manualRefresh = () => registration.update();

        if (registration.waiting) {
          notifyUpdateReady(registration);
        }
        if (registration.installing) {
          trackInstalling(registration.installing, registration);
        }

        const handleUpdateFoundInternal = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            trackInstalling(newWorker, registration);
          }
        };

        registration.addEventListener('updatefound', handleUpdateFoundInternal);
        updateFoundHandler = handleUpdateFoundInternal;

        attemptPeriodicSync(registration).catch(() => {
          registration.update().catch(() => {});
        });
      } catch (error) {
        console.error('Service worker registration failed', error);
      }
    };

    register().catch(error => {
      console.error('Service worker setup failed', error);
    });

    return () => {
      serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (registrationRef && updateFoundHandler) {
        registrationRef.removeEventListener('updatefound', updateFoundHandler);
      }
    };
  }, [dismissNotification, markAllRead, pushNotification]);
};

export default useServiceWorkerRegistration;
