import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import LegalBanner from '../components/LegalBanner';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
  }, []);
  return (
    <>
      <LegalBanner />
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
