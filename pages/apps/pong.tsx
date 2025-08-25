import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Pong = dynamic(() => import('../../apps/pong'), { ssr: false });

export default function PongPage() {
  return (
    <UbuntuWindow title="pong">
      <Pong />
    </UbuntuWindow>
  );
}
