import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Reversi = dynamic(() => import('../../apps/reversi'), { ssr: false });

export default function ReversiPage() {
  return (
    <UbuntuWindow title="reversi">
      <Reversi />
    </UbuntuWindow>
  );
}
