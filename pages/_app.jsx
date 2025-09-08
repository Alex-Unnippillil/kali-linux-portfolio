"use client";

/* global clients */

import { isBrowser } from '@/utils/env';
import { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import App from 'next/app';
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
import useReportWebVitals from '../hooks/useReportWebVitals';
import NotificationCenter from '../components/common/NotificationCenter';
import HighContrastToggle from '../components/common/HighContrastToggle';
import { Workbox } from 'workbox-window';
import Toast from '../components/ui/Toast';


let SpeedInsights = () => null;
if (process.env.NODE_ENV === 'production') {
  SpeedInsights = dynamic(
    () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
    { ssr: false },
  );
}


function MyApp(props) {
  const { Component, pageProps, nonce } = props;
  const { asPath, locales, defaultLocale } = useRouter();
  const path = asPath.split('?')[0];

  const [updateReady, setUpdateReady] = useState(false);
  const wbRef = useRef(null);

  useReportWebVitals();

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
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      wbRef.current = new Workbox('/service-worker.js');
      const wb = wbRef.current;
      wb.addEventListener('waiting', () => {
        setUpdateReady(true);
      });
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });
      const register = async () => {
        try {
          const registration = await wb.register();
          window.manualRefresh = () => wb.messageSkipWaiting();
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
    <>
      <Head>
        {locales?.map((l) => {
          const href = l === defaultLocale ? path : `/${l}${path === '/' ? '' : path}`;
          return <link key={l} rel="alternate" hrefLang={l} href={href} />;
        })}
        <link rel="alternate" hrefLang="x-default" href={path} />
      </Head>
      <ErrorBoundary>
        <Script src="/a2hs.js" strategy="beforeInteractive" nonce={nonce} />
        <div>
          <a
            href="#app-grid"
            className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
          >
            Skip to app grid
          </a>
          <SettingsProvider>
            <HighContrastToggle />
            <TrayProvider>
              <PipPortalProvider>
                <NotificationCenter>
                  <div aria-live="polite" id="live-region" />
                  <Component {...pageProps} />
                  <ShortcutOverlay />
                  {updateReady && (
                    <Toast
                      message="Update available"
                      actionLabel="Reload"
                      onAction={() => wbRef.current?.messageSkipWaiting()}
                      onClose={() => setUpdateReady(false)}
                    />
                  )}
                  <Analytics
                    beforeSend={(e) => {
                      if (e.url.includes('/admin') || e.url.includes('/private')) return null;
                      const evt = e;
                      if (evt.metadata?.email) delete evt.metadata.email;
                      return e;
                    }}
                  />
                  <SpeedInsights />
                </NotificationCenter>
              </PipPortalProvider>
            </TrayProvider>
          </SettingsProvider>
        </div>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  const nonce = appContext.ctx.req?.headers['x-csp-nonce'];
  return { ...appProps, nonce };
};

