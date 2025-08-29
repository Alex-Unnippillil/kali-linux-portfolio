import { useEffect, useState } from 'react';
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
  const [lastSync, setLastSync] = useState(null);
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
        wb
          .register()
          .then(() => {
            const setupPeriodicSync = async () => {
              try {
                const registration = await navigator.serviceWorker.ready;
                if ('periodicSync' in registration) {
                  const tags = await registration.periodicSync.getTags();
                  if (!tags.includes('task-prefetch')) {
                    await registration.periodicSync.register('task-prefetch', {
                      minInterval: 24 * 60 * 60 * 1000,
                    });
                  }
                } else {
                  navigator.serviceWorker.controller?.postMessage({
                    type: 'manual-sync',
                  });
                }
              } catch (err) {
                console.error('Periodic sync registration failed', err);
              }
            };

            if (navigator.onLine) {
              setupPeriodicSync();
            } else {
              window.addEventListener('online', setupPeriodicSync, { once: true });
            }
          })
          .catch((err) => {
            console.error('Service worker registration failed', err);
          });
      };
      register().catch((err) => {
        console.error('Service worker setup failed', err);
      });
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'last-sync') {
        const ts = event.data.timestamp;
        setLastSync(new Date(ts));
        try {
          localStorage.setItem('last-sync', String(ts));
        } catch {}
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    try {
      const stored = localStorage.getItem('last-sync');
      if (stored) setLastSync(new Date(Number(stored)));
    } catch {}
    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
    };
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
      {lastSync && (
        <p className="text-center text-xs" id="last-sync">
          Last sync: {lastSync.toLocaleString()}
        </p>
      )}
    </SettingsProvider>
  );
}

export default MyApp;
