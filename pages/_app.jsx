import { useEffect, useState } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';
import Toast from '../components/ui/Toast';

/**
 * @param {import('next/app').AppProps} props
 */
function MyApp({ Component, pageProps }) {
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
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

  useEffect(() => {
    const handleOffline = () => setToastMessage('You are offline');
    const handleOnline = () => setToastMessage('You are back online');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <SettingsProvider>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
      <Component {...pageProps} />
      <Analytics />
    </SettingsProvider>
  );
}

export default MyApp;
