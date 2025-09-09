import dynamic from 'next/dynamic';

const Memory = dynamic(() => import('../../apps/memory'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Memory;
