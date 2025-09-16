"use client";

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { ReactNode, useEffect } from 'react';
import { SettingsProvider } from '../../hooks/useSettings';
import PipPortalProvider from '../common/PipPortal';
import ShortcutOverlay from '../common/ShortcutOverlay';

type ExtendedWindow = Window & typeof globalThis & {
  initA2HS?: () => void;
  manualRefresh?: () => void;
};

type PeriodicRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
};

interface DesktopProvidersProps {
  children: ReactNode;
}

export default function DesktopProviders({ children }: DesktopProvidersProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const extendedWindow = window as ExtendedWindow;

    if (typeof extendedWindow.initA2HS === 'function') {
      extendedWindow.initA2HS();
    }

    const initAnalytics = async () => {
      const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
      if (!trackingId) return;

      try {
        const { default: ReactGA } = await import('react-ga4');
        ReactGA.initialize(trackingId);
      } catch (err) {
        console.error('Analytics initialization failed', err);
      }
    };

    initAnalytics().catch((err) => {
      console.error('Analytics setup threw', err);
    });

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          const registration = (await navigator.serviceWorker.register('/sw.js')) as PeriodicRegistration;

          extendedWindow.manualRefresh = () => registration.update();

          if (registration.periodicSync) {
            try {
              const permissions = navigator.permissions as unknown as {
                query: (descriptor: { name: string }) => Promise<PermissionStatus>;
              };

              const status = await permissions.query({ name: 'periodic-background-sync' });

              if (status.state === 'granted') {
                await registration.periodicSync.register('content-sync', {
                  minInterval: 24 * 60 * 60 * 1000,
                });
              } else {
                registration.update();
              }
            } catch (error) {
              console.error('Periodic background sync setup failed', error);
              registration.update();
            }
          } else {
            registration.update();
          }
        } catch (error) {
          console.error('Service worker registration failed', error);
        }
      };

      register().catch((err) => {
        console.error('Service worker setup failed', err);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return;

    const update = (message: string) => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };

    const handleCopy = () => update('Copied to clipboard');
    const handleCut = () => update('Cut to clipboard');
    const handlePaste = () => update('Pasted from clipboard');

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);

    const { clipboard } = navigator;
    const originalWrite = clipboard?.writeText?.bind(clipboard);
    const originalRead = clipboard?.readText?.bind(clipboard);

    if (originalWrite) {
      clipboard.writeText = async (text: string) => {
        update('Copied to clipboard');
        return originalWrite(text);
      };
    }

    if (originalRead) {
      clipboard.readText = async () => {
        const text = await originalRead();
        update('Pasted from clipboard');
        return text;
      };
    }

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
      const WrappedNotification = function (title: string, options?: NotificationOptions) {
        update(`${title}${options?.body ? ` ${options.body}` : ''}`);
        return new OriginalNotification(title, options);
      } as typeof Notification;

      WrappedNotification.requestPermission = OriginalNotification.requestPermission.bind(
        OriginalNotification,
      );

      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });

      WrappedNotification.prototype = OriginalNotification.prototype;
      window.Notification = WrappedNotification;
    }

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);

      if (clipboard) {
        if (originalWrite) clipboard.writeText = originalWrite;
        if (originalRead) clipboard.readText = originalRead;
      }

      if (OriginalNotification) {
        window.Notification = OriginalNotification;
      }
    };
  }, []);

  return (
    <SettingsProvider>
      <PipPortalProvider>
        <Script src="/a2hs.js" strategy="beforeInteractive" />
        <div aria-live="polite" id="live-region" />
        {children}
        <ShortcutOverlay />
        <Analytics
          beforeSend={(event) => {
            if (event.url.includes('/admin') || event.url.includes('/private')) {
              return null;
            }

            const evt = event;
            if (evt.metadata?.email) {
              delete evt.metadata.email;
            }

            return evt;
          }}
        />
        {process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <SpeedInsights />}
      </PipPortalProvider>
    </SettingsProvider>
  );
}
