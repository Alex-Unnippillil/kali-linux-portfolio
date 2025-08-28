import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function CalculatorPage() {
  return <Calculator />;
}

