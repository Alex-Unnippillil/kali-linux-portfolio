import dynamic from 'next/dynamic';

const TicTacToe = dynamic(() => import('../../apps/tic-tac-toe'), { ssr: false });

export default function TicTacToePage() {
  return <TicTacToe />;
}

