"use client";
/* eslint-disable @next/next/no-before-interactive-script-outside-document */

import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import PipPortalProvider from '../components/common/PipPortal';
import ErrorBoundary from '../components/core/ErrorBoundary';
import Script from 'next/script';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});


function MyApp({ Component, pageProps }: AppProps) {


  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as { initA2HS?: () => void }).initA2HS === 'function'
    ) {
      (window as { initA2HS?: () => void }).initA2HS!();
    }
    const initAnalytics = async (): Promise<void> => {
      const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
      if (trackingId) {
        const { default: ReactGA } = await import('react-ga4');
        ReactGA.initialize(trackingId);
      }
    };
    initAnalytics().catch((err: unknown) => {
      console.error('Analytics initialization failed', err);
    });

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      // Register PWA service worker generated via @ducanh2912/next-pwa
      const register = async (): Promise<void> => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          (window as { manualRefresh?: () => void }).manualRefresh = () =>
            registration.update();

          if ('periodicSync' in registration) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync',
              } as unknown as PermissionDescriptor);
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('content-sync', {
                  minInterval: 24 * 60 * 60 * 1000,
                });
              } else {
                registration.update();
              }
            } catch {
              registration.update();
            }
          } else {
            registration.update();
          }
        } catch (err: unknown) {
          console.error('Service worker registration failed', err);
        }
      };
      register().catch((err: unknown) => {
        console.error('Service worker setup failed', err);
      });
    }
  }, []);

  useEffect(() => {
    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return;

    const update = (message: string): void => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };

    const handleCopy = (): void => update('Copied to clipboard');
    const handleCut = (): void => update('Cut to clipboard');
    const handlePaste = (): void => update('Pasted from clipboard');

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);

    const { clipboard } = navigator;
    const originalWrite = clipboard?.writeText?.bind(clipboard);
    const originalRead = clipboard?.readText?.bind(clipboard);
    if (originalWrite) {
      clipboard.writeText = async (text: string): Promise<void> => {
        update('Copied to clipboard');
        return originalWrite(text);
      };
    }
    if (originalRead) {
      clipboard.readText = async (): Promise<string> => {
        const text = await originalRead();
        update('Pasted from clipboard');
        return text;
      };
    }

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
      const WrappedNotification = function (
        title: string,
        options?: NotificationOptions,
      ): Notification {
        update(`${title}${options?.body ? ' ' + options.body : ''}`);
        return new OriginalNotification(title, options);
      } as any;
      (WrappedNotification as any).requestPermission =
        OriginalNotification.requestPermission.bind(OriginalNotification);
      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });
      (WrappedNotification as any).prototype = OriginalNotification.prototype;
      window.Notification = WrappedNotification as any;
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
    <ErrorBoundary>
      <Script src="/a2hs.js" strategy="beforeInteractive" />
      <div className={ubuntu.className}>
        <SettingsProvider>
          <PipPortalProvider>
            <div aria-live="polite" id="live-region" />
            <Component {...pageProps} />
            <ShortcutOverlay />
            <Analytics
              beforeSend={(e: any) => {
                if (e.url.includes('/admin') || e.url.includes('/private')) return null;
                const evt: any = e;
                if (evt.metadata?.email) delete evt.metadata.email;
                return e;
              }}
            />

            {process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <SpeedInsights />}
          </PipPortalProvider>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

