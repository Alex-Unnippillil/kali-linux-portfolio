import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Volatility = dynamic(() => import('../../apps/volatility'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function VolatilityPage() {
  return <Volatility />;
}

export default withDeepLinkBoundary('volatility', VolatilityPage);
