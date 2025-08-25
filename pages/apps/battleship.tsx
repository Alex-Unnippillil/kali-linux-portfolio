import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Battleship = dynamic(() => import('../../apps/battleship'), {
  ssr: false,
});

export default function BattleshipPage() {
  return (
    <UbuntuWindow title="battleship">
      <Battleship />
    </UbuntuWindow>
  );
}
