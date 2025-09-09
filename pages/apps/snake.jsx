import dynamic from 'next/dynamic';

const Snake = dynamic(() => import('../../apps/snake'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Snake;
