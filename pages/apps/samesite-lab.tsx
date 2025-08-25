import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SamesiteLab = dynamic(() => import('../../apps/samesite-lab'), {
  ssr: false,
});

export default function SamesiteLabPage() {
  return (
    <UbuntuWindow title="samesite lab">
      <SamesiteLab />
    </UbuntuWindow>
  );
}
