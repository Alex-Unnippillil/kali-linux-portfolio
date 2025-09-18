"use client";

import { useEffect } from 'react';
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
import ModeBanner from '../components/core/ModeBanner';
import { ShellConfigProvider, useShellConfig } from '../hooks/useShellConfig';
import { startClipboardWatcher } from '../modules/system/clipboardWatcher';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});


function MyApp(props) {
  const { Component, pageProps } = props;


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

  const ShellRuntime = ({ Component: RuntimeComponent, pageProps: runtimeProps }) => {
    const { captureEvidence, redTeamMode, pushWarning } = useShellConfig();

    useEffect(() => {
      const liveRegion = document.getElementById('live-region');
      const update = (message) => {
        if (!liveRegion) return;
        liveRegion.textContent = '';
        window.setTimeout(() => {
          if (liveRegion) liveRegion.textContent = message;
        }, 100);
      };

      const stopWatcher = startClipboardWatcher({
        onCopy: ({ type }) => {
          if (type === 'cut') update('Cut to clipboard');
          else update('Copied to clipboard');
        },
        onWarn: (warning) => {
          if (!redTeamMode) return;
          pushWarning({
            message: warning.description,
            severity: 'critical',
            context: {
              matches: warning.matches,
              type: warning.type,
            },
          });
          captureEvidence({
            source: 'clipboard',
            content: warning.text,
            tags: ['clipboard', warning.pattern],
            metadata: {
              matches: warning.matches,
              type: warning.type,
              description: warning.description,
            },
          });
        },
      });

      const handlePaste = () => update('Pasted from clipboard');
      window.addEventListener('paste', handlePaste);

      const { clipboard } = navigator;
      const originalRead = clipboard?.readText?.bind(clipboard);
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
        WrappedNotification.requestPermission =
          OriginalNotification.requestPermission.bind(OriginalNotification);
        Object.defineProperty(WrappedNotification, 'permission', {
          get: () => OriginalNotification.permission,
        });
        WrappedNotification.prototype = OriginalNotification.prototype;
        window.Notification = WrappedNotification;
      }

      return () => {
        stopWatcher();
        window.removeEventListener('paste', handlePaste);
        if (clipboard && originalRead) {
          clipboard.readText = originalRead;
        }
        if (OriginalNotification) {
          window.Notification = OriginalNotification;
        }
      };
    }, [captureEvidence, pushWarning, redTeamMode]);

    return (
      <>
        <ModeBanner />
        <div aria-live="polite" id="live-region" />
        <RuntimeComponent {...runtimeProps} />
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
      </>
    );
  };

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
          <ShellConfigProvider>
            <PipPortalProvider>
              <ShellRuntime Component={Component} pageProps={pageProps} />
            </PipPortalProvider>
          </ShellConfigProvider>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

