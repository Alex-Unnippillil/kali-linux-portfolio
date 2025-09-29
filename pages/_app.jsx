"use client";

import { useEffect, useMemo } from 'react';
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
import Meta from '../components/SEO/Meta';
import { useRouter } from 'next/router';
import apps from '../apps.config';
import { createRegistryMap } from '../lib/appRegistry';

import { Ubuntu } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

const SITE_ORIGIN = 'https://unnippillil.com';
const SITE_NAME = 'Alex Unnippillil Portfolio';
const DEFAULT_META = {
  title: "Alex Unnippillil's Portfolio",
  description:
    'Desktop-inspired portfolio showcasing security tool simulations, utilities, and retro games.',
  image: `${SITE_ORIGIN}/images/logos/logo_1200.png`,
  url: SITE_ORIGIN,
  type: 'website',
};

const appList = Array.isArray(apps) ? apps : [];
const registryMetadata = createRegistryMap(appList);

const normalizePath = (value) => {
  if (!value) return '/';
  const [pathWithoutQuery] = value.split(/[?#]/);
  if (!pathWithoutQuery) return '/';
  if (pathWithoutQuery === '/') return '/';
  return pathWithoutQuery.replace(/\/$/, '');
};

const toAbsoluteUrl = (value) => {
  if (!value) return DEFAULT_META.url;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${SITE_ORIGIN}${normalized}`;
};

const resolveRouteMeta = (path) => {
  const baseMeta = {
    ...DEFAULT_META,
    url: toAbsoluteUrl(path === '/' ? '/' : path),
  };

  if (path === '/' || path === '') {
    return DEFAULT_META;
  }

  if (path === '/apps') {
    return {
      ...baseMeta,
      title: `Apps Catalog | ${SITE_NAME}`,
      description: 'Browse the full catalog of Kali-inspired desktop apps, tools, and games.',
    };
  }

  if (path.startsWith('/apps/')) {
    const appId = decodeURIComponent(path.replace(/^\/apps\//, ''));
    const meta = registryMetadata[appId];
    if (meta) {
      const url = toAbsoluteUrl(meta.path ?? path);
      const image = meta.icon ? toAbsoluteUrl(meta.icon) : DEFAULT_META.image;
      return {
        title: `${meta.title} | ${SITE_NAME}`,
        description: meta.description,
        image,
        url,
        type: 'website',
      };
    }
  }

  return baseMeta;
};

function MyApp(props) {
  const { Component, pageProps } = props;
  const router = useRouter();

  const normalizedPath = useMemo(
    () => normalizePath(router.asPath || router.pathname),
    [router.asPath, router.pathname],
  );

  const meta = useMemo(() => resolveRouteMeta(normalizedPath), [normalizedPath]);


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
      <Meta {...meta} />
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
            </PipPortalProvider>
          </NotificationCenter>
        </SettingsProvider>
      </div>
    </ErrorBoundary>


  );
}

export default MyApp;

export { reportWebVitalsUtil as reportWebVitals };

