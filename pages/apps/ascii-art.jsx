import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const AsciiArt = dynamic(() => import('../../apps/ascii-art'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('ascii-art', AsciiArt);