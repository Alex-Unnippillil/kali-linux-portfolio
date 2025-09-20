import { getPageMetadata } from '@/lib/metadata';
import '../../utils/decimal';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/calculator');

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function CalculatorPage() {
  return <Calculator />;
}

