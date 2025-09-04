import dynamic from 'next/dynamic';

const EstimateApp = dynamic(() => import('../../apps/estimate'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function EstimatePage() {
  return <EstimateApp />;
}
