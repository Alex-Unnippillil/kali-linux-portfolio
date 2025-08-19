import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import 'tailwindcss/tailwind.css';
import '../styles/index.css';
import { initAnalytics } from '../lib/analytics';
import ConsentBanner from '../components/ConsentBanner';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initAnalytics(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <ConsentBanner />
    </>
  );
}

export default MyApp;
