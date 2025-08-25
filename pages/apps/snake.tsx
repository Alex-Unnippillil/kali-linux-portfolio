import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Snake = dynamic(() => import('../../apps/snake'), { ssr: false });

export default function SnakePage() {
  return (
    <UbuntuWindow title="snake">
      <Snake />
    </UbuntuWindow>
  );
}
