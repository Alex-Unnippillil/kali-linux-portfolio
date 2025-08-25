import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Memory = dynamic(() => import('../../apps/memory'), { ssr: false });

export default function MemoryPage() {
  return (
    <UbuntuWindow title="memory">
      <Memory />
    </UbuntuWindow>
  );
}
