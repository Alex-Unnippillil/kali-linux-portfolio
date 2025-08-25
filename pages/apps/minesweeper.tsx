import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Minesweeper = dynamic(() => import('../../apps/minesweeper'), {
  ssr: false,
});

export default function MinesweeperPage() {
  return (
    <UbuntuWindow title="minesweeper">
      <Minesweeper />
    </UbuntuWindow>
  );
}
