import dynamic from 'next/dynamic';

const TicTacToePage = dynamic(() => import('../../components/apps/tictactoe'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default TicTacToePage;
