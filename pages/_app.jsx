"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
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
import NotificationCenter from '../components/common/NotificationCenter';
import PipPortalProvider from '../components/common/PipPortal';
import ErrorBoundary from '../components/core/ErrorBoundary';
import Script from 'next/script';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';
import Toast from '../components/ui/Toast';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});


function MyApp(props) {
  const { Component, pageProps } = props;

  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const serviceWorkerRegistrationRef = useRef(null);
  const UPDATE_DEFER_KEY = 'pwa-update-deferred';

  const shouldSuppressUpdateToast = useCallback(() => {
    if (typeof window === 'undefined') return false;

    try {
      const storage = window.sessionStorage;
      const storedValue = storage?.getItem(UPDATE_DEFER_KEY);
      if (storedValue === 'true') {
        return true;
      }
    } catch (error) {
      console.warn('Unable to read update deferral preference', error);
    }

    return false;
  }, [UPDATE_DEFER_KEY]);

  const handleWaitingServiceWorker = useCallback(
    (registration) => {
      if (
        typeof window === 'undefined' ||
        !registration ||
        !registration.waiting ||
        shouldSuppressUpdateToast()
      ) {
        return;
      }

      serviceWorkerRegistrationRef.current = registration;
      setShowUpdateToast(true);
    },
    [shouldSuppressUpdateToast],
  );

  const handleUpdateLater = useCallback(() => {
    setShowUpdateToast(false);
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage?.setItem(UPDATE_DEFER_KEY, 'true');
    } catch (error) {
      console.warn('Unable to persist update deferral', error);
    }
  }, [UPDATE_DEFER_KEY]);

  const handleUpdateNow = useCallback(() => {
    const registration = serviceWorkerRegistrationRef.current;

    if (!registration || !registration.waiting) {
      return;
    }

    try {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      console.error('Failed to request service worker activation', error);
    }

    setShowUpdateToast(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.initA2HS === 'function') {
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

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      // Register PWA service worker generated via @ducanh2912/next-pwa
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          window.manualRefresh = () => registration.update();
          serviceWorkerRegistrationRef.current = registration;

          if (registration.waiting) {
            handleWaitingServiceWorker(registration);
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (registration.waiting) {
                handleWaitingServiceWorker(registration);
              }
            });
          });

          if ('periodicSync' in registration) {
            try {
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
  }, [handleWaitingServiceWorker]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (process.env.NODE_ENV !== 'production') return undefined;

    const workbox = window.workbox;
    if (!workbox || typeof workbox.addEventListener !== 'function') {
      return undefined;
    }

    const handleWorkboxWaiting = async () => {
      if (serviceWorkerRegistrationRef.current?.waiting) {
        handleWaitingServiceWorker(serviceWorkerRegistrationRef.current);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (registration) {
          serviceWorkerRegistrationRef.current = registration;
          handleWaitingServiceWorker(registration);
        }
      } catch (error) {
        console.error('Failed to read service worker registration', error);
      }
    };

    workbox.addEventListener('waiting', handleWorkboxWaiting);

    return () => {
      workbox.removeEventListener('waiting', handleWorkboxWaiting);
    };
  }, [handleWaitingServiceWorker]);

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

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
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
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script src="/a2hs.js" strategy="beforeInteractive" />
      <div className={ubuntu.className}>
        <a
          href="#app-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
        >
          Skip to app grid
        </a>
        <SettingsProvider>
          <NotificationCenter>
            <PipPortalProvider>
              <div aria-live="polite" id="live-region" />
              <Component {...pageProps} />
              <ShortcutOverlay />
              <Analytics
                beforeSend={(e) => {
                  if (e.url.includes('/admin') || e.url.includes('/private')) return null;
                  const evt = e;
                  if (evt.metadata?.email) delete evt.metadata.email;
                  return e;
                }}
              />

              {process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <SpeedInsights />}
              {showUpdateToast && (
                <Toast
                  message="New version available"
                  actionLabel="Reload now"
                  onAction={handleUpdateNow}
                  secondaryActionLabel="Later"
                  onSecondaryAction={handleUpdateLater}
                  onClose={handleUpdateLater}
                  duration={null}
                />
              )}
            </PipPortalProvider>
          </NotificationCenter>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

