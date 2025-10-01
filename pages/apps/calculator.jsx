import '../../utils/decimal';
import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Calculator = dynamic(() => import('../../apps/calculator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function CalculatorPage() {
  return <Calculator />;
}

export default withDeepLinkBoundary('calculator', CalculatorPage);
