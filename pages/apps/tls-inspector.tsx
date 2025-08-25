import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TlsInspector = dynamic(() => import('../../apps/tls-inspector'), {
  ssr: false,
});

export default function TlsInspectorPage() {
  return (
    <UbuntuWindow title="tls inspector">
      <TlsInspector />
    </UbuntuWindow>
  );
}
