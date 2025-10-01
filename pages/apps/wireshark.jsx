import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Wireshark = dynamic(() => import('../../apps/wireshark'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function WiresharkPage() {
  return <Wireshark />;
}

export default withDeepLinkBoundary('wireshark', WiresharkPage);
