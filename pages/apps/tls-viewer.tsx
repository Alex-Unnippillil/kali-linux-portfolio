import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const TlsViewer = dynamic(() => import('../../apps/tls-viewer'), {
  ssr: false,
});

export default function TlsViewerPage() {
  return (
    <UbuntuWindow title="tls viewer">
      <TlsViewer />
    </UbuntuWindow>
  );
}
