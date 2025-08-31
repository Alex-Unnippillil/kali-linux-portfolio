import dynamic from '@/utils/dynamic';

const Minesweeper = dynamic(() => import('@/apps/minesweeper'), {
  ssr: false,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}

