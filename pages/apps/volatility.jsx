import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Volatility = dynamic(() => import('../../apps/volatility'), {
  ssr: false,
  loading: () => getAppSkeleton('volatility', 'Volatility'),
});

export default function VolatilityPage() {
  return <Volatility />;
}
