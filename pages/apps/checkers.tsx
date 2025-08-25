import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Checkers = dynamic(() => import('../../apps/checkers'), { ssr: false });

export default function CheckersPage() {
  return (
    <UbuntuWindow title="checkers">
      <Checkers />
    </UbuntuWindow>
  );
}
