import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';

const inter = Inter({ subsets: ['latin'] });

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    if (trackingId) {
      ReactGA.initialize(trackingId);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
      <Analytics />
    </main>
  );
}

export default MyApp;
