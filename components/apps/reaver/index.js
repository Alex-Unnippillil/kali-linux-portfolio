import dynamic from 'next/dynamic';

const Reaver = dynamic(() => import('../../apps/reaver'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default Reaver;
