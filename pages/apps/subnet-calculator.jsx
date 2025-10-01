import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const SubnetCalculator = dynamic(() => import('../../apps/subnet-calculator'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function SubnetCalculatorPage() {
  return <SubnetCalculator />;
}

export default withDeepLinkBoundary('subnet-calculator', SubnetCalculatorPage);
