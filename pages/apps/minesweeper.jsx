import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Minesweeper = dynamic(() => import('../../apps/minesweeper'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MinesweeperPage() {
  return <Minesweeper />;
}

export default withDeepLinkBoundary('minesweeper', MinesweeperPage);
