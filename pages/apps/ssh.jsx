import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const SSHPreview = dynamic(() => import('../../apps/ssh'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function SSHPage() {
  return <SSHPreview />;
}

export default withDeepLinkBoundary('ssh', SSHPage);
