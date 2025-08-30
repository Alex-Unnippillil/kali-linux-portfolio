import dynamic from 'next/dynamic';

const Volatility = dynamic(() => import('../../apps/volatility'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function VolatilityPage() {
  return <Volatility />;
}
