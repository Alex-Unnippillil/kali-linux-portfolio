import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const NmapNSE = dynamic(() => import('../../apps/nmap-nse'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function NmapNSEPage() {
  return <NmapNSE />;
}

export default withDeepLinkBoundary('nmap-nse', NmapNSEPage);
