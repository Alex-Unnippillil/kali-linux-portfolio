"use client";

import { useEffect } from 'react';
import {
  PushNotificationInput,
  useNotificationCenter,
} from '../../hooks/useNotifications';

const SERVICE_WORKER_APP_ID = 'system://service-worker';

const buildNotification = (
  overrides: Partial<PushNotificationInput>,
): PushNotificationInput => {
  const { hints, ...rest } = overrides;

  return {
    appId: SERVICE_WORKER_APP_ID,
    title: 'Service worker status',
    priority: 'normal',
    hints: {
      'x-kali-category': 'system-update',
      ...(hints ?? {}),
    },
    ...rest,
  };
};

const ServiceWorkerBridge: React.FC = () => {
  const { pushNotification } = useNotificationCenter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let isMounted = true;
    let registration: ServiceWorkerRegistration | null = null;
    let updateFoundHandler: (() => void) | null = null;

    const notifyUpdateReady = () =>
      pushNotification(
        buildNotification({
          title: 'Desktop update ready',
          body: 'Reload to apply the latest Kali desktop build.',
          priority: 'high',
        }),
      );

    const notifyError = (message: string) =>
      pushNotification(
        buildNotification({
          title: 'Service worker issue',
          body: message,
          priority: 'normal',
          hints: {
            'x-kali-category': 'system-update',
            severity: 'error',
          },
        }),
      );

    const observeInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (!isMounted) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUpdateReady();
        }
        if (worker.state === 'redundant') {
          notifyError('A pending service worker update was replaced before activation.');
        }
      });
    };

    const ensurePeriodicSync = async (reg: ServiceWorkerRegistration) => {
      if (!('periodicSync' in reg)) {
        reg.update().catch(() => {});
        return;
      }

      try {
        const status = await navigator.permissions.query({
          // @ts-expect-error: periodic-background-sync is still experimental in TS lib
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          await reg.periodicSync.register('content-sync', {
            minInterval: 24 * 60 * 60 * 1000,
          });
        } else {
          await reg.update();
        }
      } catch (err) {
        await reg.update().catch(() => {});
        console.warn('Periodic sync registration failed', err);
      }
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (!isMounted) return;

        registration = reg;
        window.manualRefresh = () => reg.update();

        observeInstallingWorker(reg.installing);
        updateFoundHandler = () => {
          if (!isMounted) return;
          observeInstallingWorker(reg.installing);
        };
        reg.addEventListener('updatefound', updateFoundHandler);

        await ensurePeriodicSync(reg);
      } catch (error) {
        console.error('Service worker registration failed', error);
        if (isMounted) {
          notifyError('Service worker registration failed. See console for details.');
        }
      }
    };

    register().catch(error => {
      console.error('Service worker setup failed', error);
      if (isMounted) {
        notifyError('Service worker setup failed. See console for details.');
      }
    });

    return () => {
      isMounted = false;
      if (registration && updateFoundHandler) {
        registration.removeEventListener('updatefound', updateFoundHandler);
      }
      registration = null;
      updateFoundHandler = null;
      if ('manualRefresh' in window) {
        delete window.manualRefresh;
      }
    };
  }, [pushNotification]);

  return null;
};

export default ServiceWorkerBridge;
