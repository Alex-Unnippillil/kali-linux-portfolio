import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const MixedContent = dynamic(() => import('../../apps/mixed-content'), {
  ssr: false,
});

export default function MixedContentPage() {
  return (
    <UbuntuWindow title="mixed content">
      <MixedContent />
    </UbuntuWindow>
  );
}
