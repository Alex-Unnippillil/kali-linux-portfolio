import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Pacman = dynamic(() => import('../../apps/pacman'), { ssr: false });

export default function PacmanPage() {
  return (
    <UbuntuWindow title="pacman">
      <Pacman />
    </UbuntuWindow>
  );
}
