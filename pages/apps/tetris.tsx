import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Tetris = dynamic(() => import('../../apps/tetris'), { ssr: false });

export default function TetrisPage() {
  return (
    <UbuntuWindow title="tetris">
      <Tetris />
    </UbuntuWindow>
  );
}
