import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '../styles/print.css';
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

  useEffect(() => {
    const liveRegion = document.getElementById('live-region');
    if (!liveRegion) return;

    const update = (message) => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };

    const handleCopy = () => update('Copied to clipboard');
    const handleCut = () => update('Cut to clipboard');
    const handlePaste = () => update('Pasted from clipboard');

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);

    const { clipboard } = navigator;
    const originalWrite = clipboard?.writeText?.bind(clipboard);
    const originalRead = clipboard?.readText?.bind(clipboard);
    if (originalWrite) {
      clipboard.writeText = async (text) => {
        update('Copied to clipboard');
        return originalWrite(text);
      };
    }
    if (originalRead) {
      clipboard.readText = async () => {
        const text = await originalRead();
        update('Pasted from clipboard');
        return text;
      };
    }

    const OriginalNotification = window.Notification;
    if (OriginalNotification) {
      const WrappedNotification = function (title, options) {
        update(`${title}${options?.body ? ' ' + options.body : ''}`);
        return new OriginalNotification(title, options);
      };
      WrappedNotification.requestPermission = OriginalNotification.requestPermission.bind(
        OriginalNotification,
      );
      Object.defineProperty(WrappedNotification, 'permission', {
        get: () => OriginalNotification.permission,
      });
      WrappedNotification.prototype = OriginalNotification.prototype;
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
    <SettingsProvider>
      <div aria-live="polite" id="live-region" />
      <Component {...pageProps} />
      <ShortcutOverlay />
      <Analytics />
    </SettingsProvider>
  );
}

export default MyApp;
