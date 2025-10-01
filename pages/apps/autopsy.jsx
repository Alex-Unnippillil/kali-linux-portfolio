import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Autopsy = dynamic(() => import('../../apps/autopsy'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function AutopsyPage() {
  return <Autopsy />;
}

export default withDeepLinkBoundary('autopsy', AutopsyPage);
