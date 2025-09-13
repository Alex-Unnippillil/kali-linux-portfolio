import dynamic from 'next/dynamic';

const FirefoxApp = dynamic(() => import('../../../apps/firefox'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FirefoxApp;
export const displayFirefox = () => <FirefoxApp />;
