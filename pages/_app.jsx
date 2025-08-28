import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';
import ShortcutOverlay from '../components/common/ShortcutOverlay';

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
      const register = async () => {
        const { Workbox } = await import('workbox-window');
        const wb = new Workbox('/service-worker.js');

        const promptRefresh = () => {
          wb.addEventListener('controlling', () => {
            window.location.reload();
          });
          wb.messageSkipWaiting();
        };

        wb.addEventListener('waiting', promptRefresh);
        wb.register().catch((err) => {
          console.error('Service worker registration failed', err);
        });
      };
      register().catch((err) => {
        console.error('Service worker setup failed', err);
      });
    }
  }, []);
  return (
    <SettingsProvider>
      <Component {...pageProps} />
      <ShortcutOverlay />
      <Analytics />
    </SettingsProvider>
  );
}

export default MyApp;
