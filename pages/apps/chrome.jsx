import dynamic from 'next/dynamic';

const ChromeApp = dynamic(() => import('../../apps/chrome'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ChromeApp;
