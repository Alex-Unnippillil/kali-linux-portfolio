import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const PageX = dynamic(() => import('../../apps/x'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('x', PageX);