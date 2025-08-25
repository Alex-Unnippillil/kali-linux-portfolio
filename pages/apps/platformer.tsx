import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Platformer = dynamic(() => import('../../apps/platformer'), {
  ssr: false,
});

export default function PlatformerPage() {
  return (
    <UbuntuWindow title="platformer">
      <Platformer />
    </UbuntuWindow>
  );
}
