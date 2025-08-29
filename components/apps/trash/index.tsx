import dynamic from 'next/dynamic';

const TrashApp = dynamic(() => import('../../../apps/trash'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default TrashApp;
