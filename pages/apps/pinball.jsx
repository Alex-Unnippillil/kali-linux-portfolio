import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Pinball = dynamic(() => import('../../apps/pinball'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('pinball', Pinball);