import { useEffect, useState } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';
import HelpPopover from '../components/ui/HelpPopover';

/**
 * @param {import('next/app').AppProps} props
 */
function MyApp({ Component, pageProps }) {
  const [help, setHelp] = useState(null);
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
    const handler = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        const target = document.activeElement;
        if (target) {
          const text =
            target.getAttribute('data-help') ||
            target.getAttribute('title') ||
            'No help available.';
          const rect = target.getBoundingClientRect();
          setHelp({ text, x: rect.left + window.scrollX, y: rect.bottom + window.scrollY });
        }
      } else if (e.key === 'Escape') {
        setHelp(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <SettingsProvider>
      <Component {...pageProps} />
      {help && <HelpPopover {...help} />}
      <Analytics />
    </SettingsProvider>
  );
}

export default MyApp;
