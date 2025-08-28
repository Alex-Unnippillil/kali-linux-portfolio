import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';
import { registerWebVitals } from '../lib/web-vitals';

/**
 * @param {import('next/app').AppProps} props
 */
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    const analyticsEnabled = window.localStorage.getItem('analytics') !== 'false';
    if (trackingId && analyticsEnabled) {
      ReactGA.initialize(trackingId);
    }

    if (analyticsEnabled) {
      registerWebVitals((metric) => {
        if (trackingId) {
          ReactGA.event({
            category: 'Web Vitals',
            action: metric.name,
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            label: metric.id,
            nonInteraction: true,
          });
        } else if (process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) {
          const body = JSON.stringify({
            dsn: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
            id: metric.id,
            page: window.location.pathname,
            href: window.location.href,
            event_name: metric.name,
            value: metric.value.toString(),
            speed: metric.navigationEntry ? metric.navigationEntry.type : undefined,
          });
          const url = 'https://vitals.vercel-insights.com/v1/vitals';
          if (navigator.sendBeacon) {
            navigator.sendBeacon(url, body);
          } else {
            fetch(url, { body, method: 'POST', keepalive: true });
          }
        }
      });
    }
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      fetch('/service-worker.js', { method: 'HEAD' })
        .then((res) => {
          if (res.ok) {
            navigator.serviceWorker
              .register('/service-worker.js')
              .catch((err) => {
                console.error('Service worker registration failed', err);
              });
          } else {
            console.warn('Service worker file not found');
          }
        })
        .catch((err) => {
          console.error('Service worker check failed', err);
        });
    }
  }, []);
  return (
    <SettingsProvider>
      <Component {...pageProps} />
      <Analytics />
    </SettingsProvider>
  );
}

export default MyApp;
