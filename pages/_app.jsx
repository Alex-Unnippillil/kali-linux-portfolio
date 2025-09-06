"use client";

import { isBrowser } from '@/utils/env';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import dynamic from 'next/dynamic';
import '../styles/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import PipPortalProvider from '../components/common/PipPortal';
import { TrayProvider } from '../hooks/useTray';
import ErrorBoundary from '../components/core/ErrorBoundary';
import Script from 'next/script';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

let SpeedInsights = () => null;
if (process.env.NODE_ENV === 'production') {
  SpeedInsights = dynamic(
    () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
    { ssr: false },
  );
}


function MyApp(props) {
  const { Component, pageProps } = props;

  useEffect(() => {
    void import('@xterm/xterm/css/xterm.css');
    void import('leaflet/dist/leaflet.css');
  }, []);

  useEffect(() => {
    if (isBrowser() && typeof window.initA2HS === 'function') {
      window.initA2HS();
    }
    const initAnalytics = async () => {
      const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
      if (trackingId) {
        const { default: ReactGA } = await import('react-ga4');
        ReactGA.initialize(trackingId);
      }
    };
    initAnalytics().catch((err) => {
      console.error('Analytics initialization failed', err);
    });

    if (
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      // Register PWA service worker generated via @ducanh2912/next-pwa
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          window.manualRefresh = () => registration.update();

          if ('periodicSync' in registration) {
            try {
              if (
                'permissions' in navigator &&
                typeof navigator.permissions.query === 'function'
              ) {
                const status = await navigator.permissions.query({
                  name: 'periodic-background-sync',
                });
                if (status.state === 'granted') {
                  await registration.periodicSync.register('content-sync', {
                    minInterval: 24 * 60 * 60 * 1000,
                  });
                } else {
                  registration.update();
                }
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
    let active = true;
    import('web-vitals/attribution')
      .then(({ onTTI }) => {
        onTTI(({ value, id }) => {
          if (active) {
            reportWebVitalsUtil({ id, name: 'TTI', value });
          }
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return;

    const update = (message) => {
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

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      if (clipboard) {
        if (originalWrite) clipboard.writeText = originalWrite;
        if (originalRead) clipboard.readText = originalRead;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return;

    const update = (message) => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };

    const OriginalNotification = window.Notification;
    if (!OriginalNotification) return;

    const WrappedNotification = function (title, options) {
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

    window.Notification = WrappedNotification;

    return () => {
      window.Notification = OriginalNotification;
    };
  }, []);

  return (
    <ErrorBoundary>
      <Script src="/a2hs.js" strategy="beforeInteractive" />
      <div className={ubuntu.className}>
        <a
          href="#app-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
        >
          Skip to app grid
        </a>
        <SettingsProvider>
          <TrayProvider>
            <PipPortalProvider>
              <div aria-live="polite" id="live-region" />
              <Component {...pageProps} />
              <ShortcutOverlay />
              {process.env.VERCEL_ANALYTICS_ID && (
                <>
                  <Analytics
                    beforeSend={(e) => {
                      if (e.url.includes('/admin') || e.url.includes('/private')) return null;
                      const evt = e;
                      if (evt.metadata?.email) delete evt.metadata.email;
                      return e;
                    }}
                  />

                  <SpeedInsights />
                </>
              )}
            </PipPortalProvider>
          </TrayProvider>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

