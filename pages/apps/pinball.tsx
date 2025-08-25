import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Pinball = dynamic(() => import('../../apps/pinball'), { ssr: false });

export default function PinballPage() {
  return (
    <UbuntuWindow title="pinball">
      <Pinball />
    </UbuntuWindow>
  );
}
