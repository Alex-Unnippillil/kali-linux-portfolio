import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';

/**
 * @param {import('next/app').AppProps} props
 */
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      fetch('/service-worker.js')
        .then((response) => {
          if (response.ok) {
            navigator.serviceWorker
              .register('/service-worker.js')
              .catch((error) => {
                console.error('Service worker registration failed', error);
              });
          } else {
            console.error('Service worker file not found');
          }
        })
        .catch((error) => {
          console.error('Failed to fetch service worker', error);
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
