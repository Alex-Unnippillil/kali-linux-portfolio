import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Beef = dynamic(() => import('../../apps/beef'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function BeefPage() {
  return <Beef />;
}

export default withDeepLinkBoundary('beef', BeefPage);
