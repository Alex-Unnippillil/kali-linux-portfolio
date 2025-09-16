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
import Link from 'next/link';
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import PipPortalProvider from '../components/common/PipPortal';
import ErrorBoundary from '../components/core/ErrorBoundary';
import Script from 'next/script';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

const NAV_LINKS = [
  { href: '/', label: 'Desktop' },
  { href: '/apps', label: 'App catalog' },
  { href: '/daily-quote', label: 'Daily quote' },
  { href: '/profile', label: 'Timeline' },
];


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
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black"
        >
          Skip to main content
        </a>
        <SettingsProvider>
          <PipPortalProvider>
            <div aria-live="polite" id="live-region" />
            <div className="flex min-h-screen flex-col">
              <header className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-0 focus-within:top-0 focus-within:z-50 focus-within:bg-white focus-within:text-black focus-within:p-4 focus-within:shadow-lg">
                <h1 className="text-lg font-semibold">
                  <Link href="/" className="focus:outline-none focus-visible:ring">
                    Kali Linux Portfolio
                  </Link>
                </h1>
              </header>
              <nav
                aria-label="Primary"
                className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-0 focus-within:top-16 focus-within:z-50 focus-within:bg-white focus-within:text-black focus-within:p-4 focus-within:shadow-lg"
              >
                <ul className="flex flex-col gap-2">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="underline focus:outline-none focus-visible:ring focus-visible:ring-offset-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                <Component {...pageProps} />
              </main>
              <footer className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:bottom-0 focus-within:left-0 focus-within:z-50 focus-within:bg-white focus-within:text-black focus-within:p-4 focus-within:shadow-lg">
                <p>
                  © {new Date().getFullYear()} Alex Unnippillil. Educational simulations only.
                </p>
              </footer>
            </div>
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

