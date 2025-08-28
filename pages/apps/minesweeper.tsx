import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const Minesweeper = dynamic(() => import('../../components/apps/minesweeper'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}

