import dynamic from 'next/dynamic';
import { getDailySeed } from '../../utils/dailySeed';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const PhaserMatter = dynamic(() => import('../../apps/phaser_matter'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function PhaserMatterPage() {
  return <PhaserMatter getDailySeed={() => getDailySeed('phaser_matter')} />;
}

export default withDeepLinkBoundary('phaser_matter', PhaserMatterPage);
