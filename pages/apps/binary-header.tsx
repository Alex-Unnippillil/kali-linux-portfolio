import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const BinaryHeader = dynamic(() => import('../../apps/binary-header'), {
  ssr: false,
});

export default function BinaryHeaderPage() {
  return (
    <UbuntuWindow title="binary header">
      <BinaryHeader />
    </UbuntuWindow>
  );
}
