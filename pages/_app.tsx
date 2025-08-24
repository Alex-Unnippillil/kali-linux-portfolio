import '../lib/dev-ssr-logger';
import type { AppProps, NextWebVitalsMetric } from 'next/app';
import { useEffect, useState } from 'react';
import { initAxiom } from '../lib/axiom';
import { maskPII, trackWebVital } from '../lib/analytics';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import ConsentBanner from '../components/ConsentBanner';
import { validatePublicEnv } from '../lib/validate';

const inter = Inter({ subsets: ['latin'] });

validatePublicEnv(process.env);
initAxiom();

const analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

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
  return maskPII(rest);
};

// Default to no-op analytics until consent is granted
ReactGA.event = () => {};
ReactGA.send = () => {};

function MyApp({ Component, pageProps }: AppProps & { pageProps: any }) {
  const [enableAnalytics, setEnableAnalytics] = useState(false);
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);
  const nonce = pageProps?.nonce;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('analytics-consent');
      if (stored === 'granted' || stored === 'denied') {
        setConsent(stored);
      }
    }

    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const errorHandler = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ): void => {
      const payload = maskPII({
        message: String(message),
        source,
        lineno,
        colno,
        stack: error?.stack,
      });
      try {
        fetch('/api/reportException', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // ignore network errors
      }
    };

    window.onerror = errorHandler;
    return () => {
      window.onerror = null;
    };
  }, []);

  useEffect(() => {
    if (consent === 'granted' && shouldTrack && analyticsEnabled) {
      const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
      if (trackingId) {
        schedule(() => {
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

          const options = nonce ? { nonce } : undefined;
          ReactGA.initialize(trackingId, options);
          setEnableAnalytics(true);
        });
      }
    } else {
      ReactGA.event = () => {};
      ReactGA.send = () => {};
    }
  }, [consent, nonce]);

  return (
    <main className={inter.className} suppressHydrationWarning data-app-root>
      <Component {...pageProps} />
      {analyticsEnabled && enableAnalytics && shouldTrack && (
        <Analytics nonce={nonce} />
      )}
      {consent === null && (
        <ConsentBanner
          onConsent={(granted) => setConsent(granted ? 'granted' : 'denied')}
        />
      )}
    </main>
  );
}

export default MyApp;

export function reportWebVitals(metric: NextWebVitalsMetric): void {
  if (
    analyticsEnabled &&
    typeof window !== 'undefined' &&
    window.localStorage.getItem('analytics-consent') === 'granted'
  ) {
    trackWebVital(metric);
  }
}
