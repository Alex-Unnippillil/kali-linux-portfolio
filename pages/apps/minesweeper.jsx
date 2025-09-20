import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const Minesweeper = dynamic(() => import('../../apps/minesweeper'), {
  ssr: false,
  loading: () => getAppSkeleton('minesweeper', 'Minesweeper'),
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}
