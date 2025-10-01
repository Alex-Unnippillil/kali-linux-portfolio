import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const HTTPPreview = dynamic(() => import('../../apps/http'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function HTTPPage() {
  return <HTTPPreview />;
}

export default withDeepLinkBoundary('http', HTTPPage);
