import dynamic from '@/utils/dynamic';

const Volatility = dynamic(() => import('@/apps/volatility'), {
  ssr: false,
});

export default function VolatilityPage() {
  return <Volatility />;
}
