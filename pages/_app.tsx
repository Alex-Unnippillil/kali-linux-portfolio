import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/globals.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // ignore registration errors
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
