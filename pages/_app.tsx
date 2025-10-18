"use client";

import { useEffect } from 'react';
import type { ReactElement } from 'react';
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
import { FirstRunToast } from '../components/ui/Toast';
import NotificationCenter from '../components/common/NotificationCenter';
import PipPortalProvider from '../components/common/PipPortal';
import ErrorBoundary from '../components/core/ErrorBoundary';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';
import { Rajdhani } from 'next/font/google';
import type { BeforeSendEvent } from '@vercel/analytics';

type PeriodicSyncPermissionDescriptor = PermissionDescriptor & {
  name: 'periodic-background-sync';
};

declare global {
  interface Window {
    manualRefresh?: () => Promise<void>;
  }

  interface ServiceWorkerRegistration {
    periodicSync?: {
      register: (tag: string, options: { minInterval: number }) => Promise<void>;
    };
  }
}

const resolveServiceWorkerPath = (): string => {
  const buildPath = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    const withScheme = /^(https?:)?\/\//i.test(trimmed);
    const normalized = trimmed.endsWith('/') && trimmed !== '/' ? trimmed.replace(/\/+$/, '') : trimmed;

    if (withScheme) {
      return `${normalized}/sw.js`;
    }

    const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
    if (prefixed === '/' || prefixed === '') {
      return '/sw.js';
    }

    return `${prefixed}/sw.js`;
  };

  const assetPrefix =
    typeof window !== 'undefined'
      ? (window as typeof window & { __NEXT_DATA__?: { assetPrefix?: string } }).__NEXT_DATA__?.assetPrefix
      : undefined;

  return (
    buildPath(process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH) ??
    buildPath(assetPrefix) ??
    '/sw.js'
  );
};

interface MyAppProps extends AppProps {}

type AnalyticsEventWithMetadata = BeforeSendEvent & {
  metadata?: (Record<string, unknown> & { email?: unknown }) | undefined;
};

const kaliSans = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

function MyApp({ Component, pageProps }: MyAppProps): ReactElement {
  useEffect(() => {
    const initAnalytics = async (): Promise<void> => {
      const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
      if (trackingId) {
        const { default: ReactGA } = await import('react-ga4');
        ReactGA.initialize(trackingId);
      }
    };

    void initAnalytics().catch((err) => {
      console.error('Analytics initialization failed', err);
    });

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const swPath = resolveServiceWorkerPath();
      const register = async (): Promise<void> => {
        try {
          const registration = await navigator.serviceWorker.register(swPath);

          window.manualRefresh = async () => {
            try {
              const existingRegistration = await navigator.serviceWorker.getRegistration(swPath);
              const activeRegistration = existingRegistration ?? (await navigator.serviceWorker.register(swPath));
              await activeRegistration.update();
            } catch (manualRefreshError) {
              console.error('Service worker manual refresh failed', manualRefreshError);
            }
          };

          if ('periodicSync' in registration && registration.periodicSync) {
            try {
              const status = await navigator.permissions.query({
                name: 'periodic-background-sync',
              } as PeriodicSyncPermissionDescriptor);
              if (status.state === 'granted') {
                await registration.periodicSync.register('content-sync', {
                  minInterval: 24 * 60 * 60 * 1000,
                });
              } else {
                await registration.update();
              }
            } catch {
              await registration.update();
            }
          } else {
            await registration.update();
          }
        } catch (err) {
          console.error('Service worker registration failed', err);
        }
      };

      void register().catch((err) => {
        console.error('Service worker setup failed', err);
      });
    }

  }, []);

  useEffect(() => {
    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return undefined;

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
    if (clipboard && originalWrite) {
      clipboard.writeText = async (text: string): Promise<void> => {
        update('Copied to clipboard');
        await originalWrite(text);
      };
    }
    if (clipboard && originalRead) {
      clipboard.readText = async (): Promise<string> => {
        const text = await originalRead();
        update('Pasted from clipboard');
        return text;
      };
    }

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
      const WrappedNotification = class extends OriginalNotification {
        constructor(title: string, options?: NotificationOptions) {
          super(title, options);
          update(`${title}${options?.body ? ` ${options.body}` : ''}`);
        }
      };

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
      <div className={kaliSans.className}>
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
              <FirstRunToast />
              <Analytics
                beforeSend={(event) => {
                  if (event.url.includes('/admin') || event.url.includes('/private')) return null;
                  const evt = event as AnalyticsEventWithMetadata;
                  if (evt.metadata && 'email' in evt.metadata) {
                    delete evt.metadata.email;
                  }
                  return evt;
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
