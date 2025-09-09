import dynamic from 'next/dynamic';

const Frogger = dynamic(() => import('../../apps/frogger'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Frogger;
