import dynamic from '@/utils/dynamic';

const Volatility = dynamic(() => import('../../apps/volatility'));

export default function VolatilityPage() {
  return <Volatility />;
}
