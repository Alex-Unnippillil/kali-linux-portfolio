"use client";

import { useCallback, useEffect, useState } from 'react';
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
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';
import Toast from '../components/ui/Toast';
import initIdleReset, {
  shouldEnableIdleReset,
  SYSTEM_TOAST_DISMISS_EVENT,
  SYSTEM_TOAST_EVENT,
} from '../src/system/idleReset';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});


function MyApp(props) {
  const { Component, pageProps } = props;

  const [systemToast, setSystemToast] = useState(null);

  const handleToastClose = useCallback(() => {
    setSystemToast((current) => {
      if (!current) return null;
      current.onClose?.();
      return null;
    });
  }, []);

  const handleToastAction = useCallback(() => {
    setSystemToast((current) => {
      if (!current) return null;
      current.onAction?.();
      current.onClose?.();
      return null;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleShow = (event) => {
      const detail = event.detail;
      if (!detail) return;
      setSystemToast((current) => {
        if (current?.onClose) current.onClose();
        return { ...detail };
      });
    };

    const handleDismiss = (event) => {
      const { id } = event.detail || {};
      setSystemToast((current) => {
        if (!current) return current;
        if (!id || current.id === id) {
          current.onClose?.();
          return null;
        }
        return current;
      });
    };

    window.addEventListener(SYSTEM_TOAST_EVENT, handleShow);
    window.addEventListener(SYSTEM_TOAST_DISMISS_EVENT, handleDismiss);

    return () => {
      window.removeEventListener(SYSTEM_TOAST_EVENT, handleShow);
      window.removeEventListener(SYSTEM_TOAST_DISMISS_EVENT, handleDismiss);
    };
  }, []);

  useEffect(() => {
    if (!shouldEnableIdleReset()) return undefined;
    const controller = initIdleReset();
    return () => {
      controller.stop();
    };
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
      <Script src="/a2hs.js" strategy="beforeInteractive" />
      <div className={ubuntu.className}>
        <a
          href="#app-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
        >
          Skip to app grid
        </a>
        <SettingsProvider>
          <PipPortalProvider>
            <div aria-live="polite" id="live-region" />
            <Component {...pageProps} />
            {systemToast && (
              <Toast
                key={systemToast.id ?? systemToast.message}
                message={systemToast.message}
                actionLabel={systemToast.actionLabel}
                onAction={
                  systemToast.onAction ? handleToastAction : undefined
                }
                onClose={handleToastClose}
                duration={systemToast.duration}
              />
            )}
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
          </PipPortalProvider>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

