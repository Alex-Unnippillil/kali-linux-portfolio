import dynamic from 'next/dynamic';

const GigoloApp = dynamic(() => import('../../../apps/gigolo'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default GigoloApp;
