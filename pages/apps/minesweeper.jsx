import dynamic from '@/utils/dynamic';

const Minesweeper = dynamic(() => import('../../apps/minesweeper'));

export default function MinesweeperPage() {
  return <Minesweeper />;
}

