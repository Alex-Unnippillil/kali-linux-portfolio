import dynamic from 'next/dynamic';

const LogConsoleApp = dynamic(() => import('../../apps/log-console'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default LogConsoleApp;
