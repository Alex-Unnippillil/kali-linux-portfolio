import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import ReactGA from 'react-ga4';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import '@xterm/xterm/css/xterm.css';
import 'leaflet/dist/leaflet.css';
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import PipPortalProvider from '../components/common/PipPortal';
import FlagValuesEmitter from '../components/FlagValuesEmitter';

declare global {
  interface Window {
    manualRefresh?: () => void;
  }
}

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          window.manualRefresh = () => registration.update();

          if ('periodicSync' in registration) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as PermissionName,
              });
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
        } catch (err) {
          console.error('Service worker registration failed', err);
        }
      };
      register().catch((err) => {
        console.error('Service worker setup failed', err);
      });
    }
  }, []);

  useEffect(() => {
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
      clipboard.writeText = async (text) => {
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
        update(`${title}${options?.body ? ' ' + options.body : ''}`);
        return new OriginalNotification(title, options);
      };
      WrappedNotification.requestPermission = OriginalNotification.requestPermission.bind(
        OriginalNotification,
      );
      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });
      WrappedNotification.prototype = OriginalNotification.prototype;
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
    <SettingsProvider>
      <PipPortalProvider>
        <div aria-live="polite" id="live-region" />
        <Component {...pageProps} />
        <ShortcutOverlay />
        <Analytics
          beforeSend={(e: BeforeSendEvent) => {
            if (e.url.includes('/admin') || e.url.includes('/private')) return null;
            const evt = e as any;
            if (evt.metadata?.email) delete evt.metadata.email;
            return e;
          }}
        />

        {process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <SpeedInsights />}
      </PipPortalProvider>
    </SettingsProvider>
  );
}

export default MyApp;
