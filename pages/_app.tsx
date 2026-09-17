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
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import NotificationCenter from '../components/common/NotificationCenter';
import PipPortalProvider from '../components/common/PipPortal';
import ErrorBoundary from '../components/core/ErrorBoundary';
import { reportWebVitals as reportWebVitalsUtil } from '../utils/reportWebVitals';
import { Rajdhani } from 'next/font/google';
import type { BeforeSendEvent } from '@vercel/analytics';

type PeriodicSyncPermissionDescriptor = PermissionDescriptor & { name: 'periodic-background-sync' };
declare global {
  interface Window { manualRefresh?: () => Promise<void>; }
  interface ServiceWorkerRegistration { periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> }; }
}
const resolveServiceWorkerPath = (): string => {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '';
  const base = raw.trim().replace(/\/+$/, '');
  return `${base ? (base.startsWith('/') ? base : `/${base}`) : ''}/sw.js`;
};
type AnalyticsEventWithMetadata = BeforeSendEvent & { metadata?: Record<string, unknown> & { email?: unknown } };
const kaliSans = Rajdhani({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
// Production alone is not consent to enable telemetry. Preserve the explicit deployment opt-in.
const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true' && process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true';
const speedInsightsEnabled = analyticsEnabled && process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === 'true';
const scheduleWhenIdle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 1200 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 0);
  return () => window.clearTimeout(id);
};
function MyApp({ Component, pageProps }: AppProps): ReactElement {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const preview = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
    if (process.env.NODE_ENV !== 'production' || preview) {
      const cleanup = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          // Only remove this application's worker, not unrelated same-origin registrations.
          await Promise.all(registrations.filter((registration) => {
            const worker = registration.active ?? registration.waiting ?? registration.installing;
            return worker && new URL(worker.scriptURL).pathname === resolveServiceWorkerPath();
          }).map((registration) => registration.unregister()));
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => /(workbox|next-pwa|kali-portfolio|_next)/i.test(key)).map((key) => caches.delete(key)));
          }
        } catch (error) { console.warn('Development/preview worker cleanup failed', error); }
      };
      void cleanup();
      return;
    }
    let cancelled = false;
    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register(resolveServiceWorkerPath());
        if (cancelled) return;
        window.manualRefresh = async () => { await registration.update(); };
        if (registration.periodicSync) {
          try {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' } as PeriodicSyncPermissionDescriptor);
            if (status.state === 'granted') await registration.periodicSync.register('content-sync', { minInterval: 24 * 60 * 60 * 1000 });
          } catch { /* Periodic sync is optional; ordinary update remains available. */ }
        }
        await registration.update();
      } catch (error) { console.error('Service worker registration failed', error); }
    };
    let cancelIdle: (() => void) | undefined;
    const schedule = () => { cancelIdle = scheduleWhenIdle(() => { void register(); }); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => { cancelled = true; cancelIdle?.(); window.removeEventListener('load', schedule); delete window.manualRefresh; };
  }, []);
  return <ErrorBoundary><div className={kaliSans.className}>
    <a href="#application-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black">Skip to application content</a>
    <SettingsProvider><NotificationCenter><PipPortalProvider>
      <div aria-live="polite" id="live-region" />
      <div id="application-content" tabIndex={-1}><Component {...pageProps} /></div>
      <ShortcutOverlay />
      {analyticsEnabled && <Analytics beforeSend={(event) => {
        if (event.url.includes('/admin') || event.url.includes('/private')) return null;
        const safe = event as AnalyticsEventWithMetadata;
        if (!safe.metadata) return safe;
        const metadata = { ...safe.metadata }; delete metadata.email;
        return { ...safe, metadata };
      }} />}
      {speedInsightsEnabled && <SpeedInsights />}
    </PipPortalProvider></NotificationCenter></SettingsProvider>
  </div></ErrorBoundary>;
}
export default MyApp;
export { reportWebVitalsUtil as reportWebVitals };
