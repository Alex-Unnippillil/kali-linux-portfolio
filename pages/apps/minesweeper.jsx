import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/minesweeper');

const Minesweeper = dynamic(() => import('../../apps/minesweeper'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MinesweeperPage() {
  return <Minesweeper />;
}

