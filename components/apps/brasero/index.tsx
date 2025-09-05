import dynamic from 'next/dynamic';

const BraseroApp = dynamic(() => import('../../../apps/brasero'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default BraseroApp;
