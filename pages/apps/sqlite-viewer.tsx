import dynamic from 'next/dynamic';

const SqliteViewer = dynamic(() => import('../../apps/sqlite-viewer'), { ssr: false });

export default function SqliteViewerPage() {
  return <SqliteViewer />;
}
