import dynamic from 'next/dynamic';

const Estimator = dynamic(() => import('../../apps/estimate'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Estimator;
