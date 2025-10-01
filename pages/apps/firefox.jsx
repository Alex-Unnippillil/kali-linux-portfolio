import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const FirefoxApp = dynamic(() => import('../../apps/firefox'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('firefox', FirefoxApp);