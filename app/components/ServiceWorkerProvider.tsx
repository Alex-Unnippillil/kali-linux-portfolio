'use client';

import { useEffect } from 'react';

export default function ServiceWorkerProvider() {
  useEffect(() => {
    const register = async () => {
      if ('Notification' in window) {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }

      if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          if ('periodicSync' in registration) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as PermissionName,
              });
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('content-sync', {
                  minInterval: 24 * 60 * 60 * 1000,
                });
              }
            } catch {
              // ignore
            }
          }

          if ('registerProtocolHandler' in navigator) {
            try {
              navigator.registerProtocolHandler(
                'web+kali',
                '/share-target?url=%s',
                'Kali Linux Portfolio',
              );
            } catch {
              // ignore
            }
          }
        } catch (err) {
          console.error('Service worker registration failed', err);
        }
      }
    };

    if (typeof window !== 'undefined') {
      register();
    }
  }, []);

  return null;
}

