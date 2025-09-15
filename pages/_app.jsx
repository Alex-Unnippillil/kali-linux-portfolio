"use client";

import { useEffect, useState } from 'react';
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
import {
  initializeAnalytics,
  shouldPromptForAnalyticsConsent,
  setAnalyticsConsent,
  ANALYTICS_CONSENT,
  isAnalyticsEnvEnabled,
  getAnalyticsConsent,
} from '../lib/analytics';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});


function AnalyticsConsentModal({ onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-consent-title"
        className="bg-ub-cool-grey text-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4"
      >
        <h2 id="analytics-consent-title" className="text-lg font-semibold">
          Analytics consent
        </h2>
        <p className="text-sm leading-relaxed">
          We use Google Analytics to understand which desktop features are helpful. Analytics is
          optional and you can change this preference later from the Analytics Settings app.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="px-4 py-2 rounded bg-ub-orange text-black font-semibold hover:bg-orange-500 transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}


function MyApp(props) {
  const { Component, pageProps } = props;
  const analyticsEnvEnabled = isAnalyticsEnvEnabled();
  const [showAnalyticsConsent, setShowAnalyticsConsent] = useState(false);

  const handleAnalyticsAccept = () => {
    setAnalyticsConsent(ANALYTICS_CONSENT.GRANTED);
    initializeAnalytics();
    setShowAnalyticsConsent(false);
  };

  const handleAnalyticsDecline = () => {
    setAnalyticsConsent(ANALYTICS_CONSENT.DENIED);
    setShowAnalyticsConsent(false);
  };


  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.initA2HS === 'function') {
      window.initA2HS();
    }

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
    if (!analyticsEnvEnabled) return;
    const consent = getAnalyticsConsent();
    if (consent === ANALYTICS_CONSENT.GRANTED) {
      initializeAnalytics();
      return;
    }
    if (consent === ANALYTICS_CONSENT.DENIED) {
      setAnalyticsConsent(ANALYTICS_CONSENT.DENIED);
      return;
    }
    if (shouldPromptForAnalyticsConsent()) {
      setShowAnalyticsConsent(true);
    }
  }, [analyticsEnvEnabled]);

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
            <ShortcutOverlay />
            {analyticsEnvEnabled && showAnalyticsConsent && (
              <AnalyticsConsentModal
                onAccept={handleAnalyticsAccept}
                onDecline={handleAnalyticsDecline}
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

            {process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true' && <SpeedInsights />}
          </PipPortalProvider>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

