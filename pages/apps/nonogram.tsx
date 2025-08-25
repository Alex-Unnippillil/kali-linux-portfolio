import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Nonogram = dynamic(() => import('../../apps/nonogram'), { ssr: false });

export default function NonogramPage() {
  return (
    <UbuntuWindow title="nonogram">
      <Nonogram />
    </UbuntuWindow>
  );
}
