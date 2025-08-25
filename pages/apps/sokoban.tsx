import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Sokoban = dynamic(() => import('../../apps/sokoban'), { ssr: false });

export default function SokobanPage() {
  return (
    <UbuntuWindow title="sokoban">
      <Sokoban />
    </UbuntuWindow>
  );
}
