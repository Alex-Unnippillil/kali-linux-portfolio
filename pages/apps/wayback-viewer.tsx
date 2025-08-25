import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const WaybackViewer = dynamic(() => import('../../apps/wayback-viewer'), {
  ssr: false,
});

export default function WaybackViewerPage() {
  return (
    <UbuntuWindow title="wayback viewer">
      <WaybackViewer />
    </UbuntuWindow>
  );
}
