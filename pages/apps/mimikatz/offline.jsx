import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../../utils/deeplink';

const MimikatzOffline = dynamic(() => import('../../../apps/mimikatz/offline'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MimikatzOfflinePage() {
  return <MimikatzOffline />;
}

export default withDeepLinkBoundary('mimikatz/offline', MimikatzOfflinePage);
