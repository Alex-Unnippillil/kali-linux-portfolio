import dynamic from 'next/dynamic';

const Tetris = dynamic(() => import('../../apps/tetris'), { ssr: false });

export default function TetrisPage() {
  return <Tetris />;
}
