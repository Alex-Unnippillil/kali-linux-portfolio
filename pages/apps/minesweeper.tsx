import dynamic from 'next/dynamic';

const Minesweeper = dynamic(() => import('../../components/apps/minesweeper'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}

