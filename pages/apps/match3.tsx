import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Match3 = dynamic(() => import('../../apps/match3'), { ssr: false });

export default function Match3Page() {
  return (
    <UbuntuWindow title="match3">
      <Match3 />
    </UbuntuWindow>
  );
}
