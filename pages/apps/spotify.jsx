import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const SpotifyApp = dynamic(() => import('../../apps/spotify'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('spotify', SpotifyApp);
