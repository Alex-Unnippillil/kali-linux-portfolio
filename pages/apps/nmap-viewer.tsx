import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const NmapViewer = dynamic(() => import('../../apps/nmap-viewer'), {
  ssr: false,
});

export default function NmapViewerPage() {
  return (
    <UbuntuWindow title="nmap viewer">
      <NmapViewer />
    </UbuntuWindow>
  );
}
