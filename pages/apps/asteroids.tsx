import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Asteroids = dynamic(() => import('../../apps/asteroids'), { ssr: false });

export default function AsteroidsPage() {
  return (
    <UbuntuWindow title="asteroids">
      <Asteroids />
    </UbuntuWindow>
  );
}
