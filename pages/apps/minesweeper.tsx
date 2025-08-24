import dynamic from 'next/dynamic';

const Minesweeper = dynamic(() => import('../../apps/minesweeper'), {
  ssr: false,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}
