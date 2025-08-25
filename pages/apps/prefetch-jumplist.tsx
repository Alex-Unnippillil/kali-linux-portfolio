import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const PrefetchJumplist = dynamic(() => import('../../apps/prefetch-jumplist'), {
  ssr: false,
});

export default function PrefetchJumplistPage() {
  return (
    <UbuntuWindow title="prefetch jumplist">
      <PrefetchJumplist />
    </UbuntuWindow>
  );
}
