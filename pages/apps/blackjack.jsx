import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Blackjack = dynamic(() => import('../../apps/blackjack'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function BlackjackPage() {
  return <Blackjack />;
}

export default withDeepLinkBoundary('blackjack', BlackjackPage);
