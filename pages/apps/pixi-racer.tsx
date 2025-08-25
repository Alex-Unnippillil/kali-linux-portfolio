import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PixiRacer = dynamic(() => import('../../apps/pixi-racer'), {
  ssr: false,
});

export default function PixiRacerPage() {
  return (
    <UbuntuWindow title="pixi racer">
      <PixiRacer />
    </UbuntuWindow>
  );
}
