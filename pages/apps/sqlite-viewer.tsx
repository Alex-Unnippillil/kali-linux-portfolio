import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const SqliteViewer = dynamic(() => import('../../apps/sqlite-viewer'), {
  ssr: false,
});

export default function SqliteViewerPage() {
  return (
    <UbuntuWindow title="sqlite viewer">
      <SqliteViewer />
    </UbuntuWindow>
  );
}
