import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TicTacToe = dynamic(() => import('../../apps/tic-tac-toe'), {
  ssr: false,
});

export default function TicTacToePage() {
  return (
    <UbuntuWindow title="tic tac toe">
      <TicTacToe />
    </UbuntuWindow>
  );
}
