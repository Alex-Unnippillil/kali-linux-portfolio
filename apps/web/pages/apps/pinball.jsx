import dynamic from 'next/dynamic';

const Pinball = dynamic(() => import('../../apps/pinball'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Pinball;
