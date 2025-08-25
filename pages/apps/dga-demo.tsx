import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const DgaDemo = dynamic(() => import('../../apps/dga-demo'), { ssr: false });

export default function DgaDemoPage() {
  return (
    <UbuntuWindow title="dga demo">
      <DgaDemo />
    </UbuntuWindow>
  );
}
