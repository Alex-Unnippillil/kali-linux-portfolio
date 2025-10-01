import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const PageSolitaire = dynamic(() => import('../../apps/solitaire'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('solitaire', PageSolitaire);