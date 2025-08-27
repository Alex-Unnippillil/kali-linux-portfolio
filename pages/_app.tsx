import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import '@xterm/xterm/css/xterm.css';
import { ThemeProvider } from '../hooks/useTheme';
import * as Sentry from '@sentry/nextjs';

const ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development';
const dsnMap: Record<string, string | undefined> = {
  production: process.env.NEXT_PUBLIC_SENTRY_DSN,
  preview: process.env.NEXT_PUBLIC_SENTRY_DSN_PREVIEW,
  development: process.env.NEXT_PUBLIC_SENTRY_DSN_DEV,
};
const SENTRY_DSN = dsnMap[ENV];

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    tracesSampleRate: 1.0,
  });
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
  }, []);
  return (
    <ThemeProvider>
      <Component {...pageProps} />
      <Analytics />
    </ThemeProvider>
  );
}

export default MyApp;
