import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const John = dynamic(() => import('../../apps/john'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function JohnPage() {
  return <John />;
}

export default withDeepLinkBoundary('john', JohnPage);
