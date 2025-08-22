import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/next';
import { trackEvent, captureError } from '../lib/analytics';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }

    const handleRoute = (url: string) => trackEvent('pageview', url);
    router.events.on('routeChangeComplete', handleRoute);

    const handleError = (event: ErrorEvent) => captureError(event.error, 'global');
    window.addEventListener('error', handleError);

    return () => {
      router.events.off('routeChangeComplete', handleRoute);
      window.removeEventListener('error', handleError);
    };
  }, [router.events]);

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
