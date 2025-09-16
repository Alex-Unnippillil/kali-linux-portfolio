import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/volatility');

const Volatility = dynamic(() => import('../../apps/volatility'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function VolatilityPage() {
  return <Volatility />;
}
