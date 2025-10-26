import dynamic from 'next/dynamic';

const CorsTesterApp = dynamic(() => import('../../apps/cors-tester'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default CorsTesterApp;
