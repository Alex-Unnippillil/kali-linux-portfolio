import type { AppProps, NextWebVitalsMetric } from 'next/app';
import { useEffect, useState } from 'react';
import { initAxiom, logEvent } from '../lib/axiom';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';

const inter = Inter({ subsets: ['latin'] });

initAxiom();

const shouldTrack = Math.random() < 0.1;

const schedule = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
};

const sanitize = (params: any) => {
  if (!params || typeof params !== 'object') return params;
  const { payload, body, data, ...rest } = params;
  return rest;
};

if (typeof window !== 'undefined') {
  const originalEvent = ReactGA.event.bind(ReactGA);
  const originalSend = ReactGA.send.bind(ReactGA);

  ReactGA.event = (...args: any[]) => {
    if (!shouldTrack) return;
    schedule(() => {
      if (typeof args[0] === 'string') {
        originalEvent(args[0], sanitize(args[1]));
      } else {
        originalEvent(sanitize(args[0]));
      }
    });
  };

  ReactGA.send = (...args: any[]) => {
    if (!shouldTrack) return;
    schedule(() => {
      originalSend(sanitize(args[0]));
    });
  };
}

function MyApp({ Component, pageProps }: AppProps) {
  const [enableAnalytics, setEnableAnalytics] = useState(false);

  useEffect(() => {
    if (shouldTrack) {
      schedule(() => {
        const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
        if (trackingId) {
          ReactGA.initialize(trackingId);
        }
        setEnableAnalytics(true);
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <main
      className={inter.className}
      suppressHydrationWarning
      data-app-root
    >
      <Component {...pageProps} />
      {enableAnalytics && shouldTrack && <Analytics />}
    </main>
  );
}

export default MyApp;

export function reportWebVitals(metric: NextWebVitalsMetric): void {
  logEvent({ type: 'web-vital', ...metric });
}
