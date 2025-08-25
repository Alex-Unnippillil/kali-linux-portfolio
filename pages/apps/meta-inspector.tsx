import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const MetaInspector = dynamic(() => import('../../apps/meta-inspector'), {
  ssr: false,
});

export default function MetaInspectorPage() {
  return (
    <UbuntuWindow title="meta inspector">
      <MetaInspector />
    </UbuntuWindow>
  );
}
