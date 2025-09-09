import dynamic from 'next/dynamic';

const TicTacToe = dynamic(() => import('../../apps/tictactoe'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function TicTacToePage() {
  return <TicTacToe />;
}
