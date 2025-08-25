import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Chess = dynamic(() => import('../../apps/chess'), { ssr: false });

export default function ChessPage() {
  return (
    <UbuntuWindow title="chess">
      <Chess />
    </UbuntuWindow>
  );
}
